﻿using LightWeightOverlay.Applications;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using WatsonWebserver;
using WatsonWebsocket;

namespace LightWeightOverlay
{
    public class LWOServer
    {
        public List<AApplication> Applications { get; set; } = new List<AApplication>();

        public Server WebServer { get; set; }
        public WatsonWsServer WebSocket { get; set; }
        public AppConfiguration Config { get; set; }

        public Dictionary<String, List<String>> Subscriptions { get; set; } = new Dictionary<string, List<string>>();
        public SharedState State { get; set; }

        public String AppDirectory = "apps";

        public LWOServer(String settingsPath, String statePath)
        {
            Config = JsonConvert.DeserializeObject<AppConfiguration>(File.ReadAllText(settingsPath));

            State = SharedState.FromJson(statePath);

            WebServer = new Server(Config.IP, Config.WebserverPort, false, defaultRoute);
            WebSocket = new WatsonWsServer(Config.IP, Config.WebsocketPort, false);

            WebSocket.MessageReceived += WsMessageReceived;
            WebSocket.ClientConnected += WsClientConnected;
            WebSocket.ClientDisconnected += WsClientDisconnected;

            WebSocket.Start();

            WebServer.ContentRoutes.Add("admin.html", false);


            var plugins = Directory.GetDirectories(AppDirectory);
            var ti = typeof(AApplication);

            foreach (var plugin in plugins)
            {
                var pFolder = plugin.Replace(AppDirectory+"\\", "");
                var dllName = Path.GetFullPath(plugin) + "/" + pFolder + ".dll";
                var dll = Assembly.LoadFrom(dllName);

                foreach (Type type in dll.GetExportedTypes().Where(x => ti.IsAssignableFrom(x)))
                {
                    AApplication c = Activator.CreateInstance(type) as AApplication;
                    c.Load(this);
                }

            }

        }

        public async Task<bool> WsClientConnected(string arg1, HttpListenerRequest arg2)
        {
            return true;
        }

        public async Task WsClientDisconnected(string arg)
        {
            foreach (var type in Subscriptions.Keys)
            {
                var list = Subscriptions[type];
                if (list.Contains(arg)) list.Remove(arg);
            }
        }

        public void AddSubscription(String client, String subscription)
        {
            if (!Subscriptions.ContainsKey(subscription))
                Subscriptions[subscription] = new List<string>();

            Subscriptions[subscription].Add(client);
        }

        public async Task Broadcast(Message msg, string ipport)
        {
            foreach (var k in Subscriptions.Keys)
            {
                if (SharedState.ComparePaths(k, msg.Path))
                {
                    foreach (var sub in Subscriptions[k])
                    {
                        if (sub != ipport)
                            await WebSocket.SendAsync(sub, JsonConvert.SerializeObject(msg));
                    }
                }
            }
        }

        public async Task WsMessageReceived(string ipport, byte[] data)
        {
            var messageAsString = Encoding.UTF8.GetString(data);

            var message = JsonConvert.DeserializeObject<Message>(messageAsString);

            if (message.Type == "Subscribe")
            {
                AddSubscription(ipport, message.Content);
                var obj = State.RetrievePath(message.Content);
                if (obj != null)
                {
                    var m = new Message() { Content = JsonConvert.SerializeObject(obj), Path = message.Content, Type = "Update" };
                    await WebSocket.SendAsync(ipport, JsonConvert.SerializeObject(m));
                }
            }
            else
            {
                if (message.Type == "Update")
                {
                    State.UpdatePath(message.Path, JsonHelper.Deserialize(message.Content));
                    State.Save();
                }

                await Broadcast(message, ipport);
            }

        }

        public static async Task defaultRoute(HttpContext arg)
        {
            arg.Response.StatusCode = 404;
            await arg.Response.Send("NO DICE!");
        }
    }
}
