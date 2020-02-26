using LightWeightOverlay;
using LightWeightOverlay.Applications;
using System;
using System.IO;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using WatsonWebserver;

namespace CacheDragon
{
    public class Dragon : IApp
    {
        private LWOServer _server;

        private static String _cDragonBaseUrl = "https://cdn.communitydragon.org/latest/";
        private static String path = "/assets/cdragon/";
        private static Regex _cdragonRegex = new Regex($"^{path}");
        //private static Regex _cdragonRegex = new Regex($"^/{path}/");
        private static async Task CDragonHandler(HttpContext ctx)
        {
            var requested = ctx.Request.RawUrlWithoutQuery.Replace(path, "");
            var url = _cDragonBaseUrl + requested;
            var cacheUri = "cache/cdragon/" + requested;

            Directory.CreateDirectory(Path.GetDirectoryName(cacheUri));

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

        public void Load(LWOServer s)
        {
            _server = s;
            _server.WebServer.DynamicRoutes.Add(HttpMethod.GET, _cdragonRegex, CDragonHandler);

            Console.WriteLine("Cache Dragon reachable under " + path);
        }

        public void Start()
        {
            throw new NotImplementedException();
        }

        public string StatusHtml()
        {
            throw new NotImplementedException();
        }

        public string StatusString()
        {
            throw new NotImplementedException();
        }

        public void Stop()
        {
            throw new NotImplementedException();
        }

        public void Unload()
        {
            _server.WebServer.DynamicRoutes.Remove(HttpMethod.GET, _cdragonRegex);  
        }
    }
}
