using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using WatsonWebserver;
using WatsonWebsocket;

namespace LightWeightOverlay
{
    class AppConfiguration
    {
        public int WebsocketPort { get; set; }
        public int WebserverPort
        {
            get; set;
        }
    }
 
    class Message
    {
        public String Type { get; set; }
        public String Path { get; set; }
        public String Content { get; set; }
    }
    class Program
    {

        static Server s;
        static WatsonWsServer ws;
        static AppConfiguration config;

        static string ip = "127.0.0.1";

        static Dictionary<String, List<String>> Subscriptions = new Dictionary<string, List<string>>();
        static SharedState state;


        static void Main(string[] args)
        {
            config = JsonConvert.DeserializeObject<AppConfiguration>(File.ReadAllText("settings.json"));

            state = SharedState.FromJson("globalstate.json");

            //var port = state.RetrievePath("lolChampSelect/session/actions[0][0]");

            //state.UpdatePath("lolChampSelect2/session/actiones/actionatos/actionation/ayayay", port);

            //File.WriteAllText("stateNew.json", JsonConvert.SerializeObject(state, Formatting.Indented));

            s = new Server(ip, config.WebserverPort, false, defaultRoute);
            ws = new WatsonWsServer(ip, config.WebsocketPort, false);

            ws.MessageReceived += WsMessageReceived;
            ws.ClientConnected += WsClientConnected;
            ws.ClientDisconnected += WsClientDisconnected;

            s.ContentRoutes.Add("apps", true);
            s.DynamicRoutes.Add(HttpMethod.GET, new Regex("^/assets/cdragon/"), CDragonHandler);

            ws.Start();

            Console.ReadLine();
        }



        private static String CDragonBaseUrl = "https://cdn.communitydragon.org/latest/";
        private static async Task CDragonHandler(HttpContext ctx)
        {
            var requested = ctx.Request.RawUrlWithoutQuery.Replace("/assets/cdragon/", "");
            var url = CDragonBaseUrl + requested;
            var cacheUri = "cache/cdragon/" + requested;

            Directory.CreateDirectory(Path.GetDirectoryName(cacheUri));

            //Console.WriteLine(ctx.Request.RawUrlWithoutQuery);
            if (!File.Exists(cacheUri))
            {
                WebClient wc = new WebClient();
                wc.DownloadFile(url, cacheUri);
                Console.WriteLine("Downloaded " + url);
                wc.Dispose();
            }

            await ctx.Response.Send(File.ReadAllBytes(cacheUri));

            return;
        }

        private static async Task<bool> WsClientConnected(string arg1, HttpListenerRequest arg2)
        {
            return true;
        }

        private static async Task WsClientDisconnected(string arg)
        {
            foreach (var type in Subscriptions.Keys)
            {
                var list = Subscriptions[type];
                if (list.Contains(arg)) list.Remove(arg);
            }
        }

        private static void AddSubscription(String client, String subscription)
        {
            if (!Subscriptions.ContainsKey(subscription))
                Subscriptions[subscription] = new List<string>();

            Subscriptions[subscription].Add(client);
        }

        private static async Task WsMessageReceived(string ipport, byte[] data)
        {
            var messageAsString = Encoding.UTF8.GetString(data);

            var message = JsonConvert.DeserializeObject<Message>(messageAsString);

            if (message.Type == "Subscribe")
            {
                AddSubscription(ipport, message.Content);
                var obj = state.RetrievePath(message.Content);
                if (obj != null)
                {
                    var m = new Message() { Content = JsonConvert.SerializeObject(obj), Path = message.Content, Type = "Update" };
                    await ws.SendAsync(ipport, JsonConvert.SerializeObject(m));
                }           
            }
            else
            {
                if (message.Type == "Update")
                {
                    state.UpdatePath(message.Path, JsonHelper.Deserialize(message.Content));
                    state.Save();
                }


                foreach(var k in Subscriptions.Keys)
                {
                    if (SharedState.ComparePaths(k, message.Path))
                    {
                        foreach (var sub in Subscriptions[k])
                        {
                            await ws.SendAsync(sub, messageAsString);
                        }
                    }
                }
            }

        }

        private static async Task defaultRoute(HttpContext arg)
        {
            arg.Response.StatusCode = 404;
            await arg.Response.Send("NO DICE!");
        }
    }
}
