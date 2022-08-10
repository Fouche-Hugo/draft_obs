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
    public class Dragon : AApplication
    {

        private static String _cDragonBaseUrl = "https://ddragon.leagueoflegends.com/cdn/";
        private static String path = "/assets/cdragon/";
        private static Regex _cdragonRegex = new Regex($"^{path}");
        //private static Regex _cdragonRegex = new Regex($"^/{path}/");
        private async Task CDragonHandler(HttpContext ctx)
        {
            var requested = ctx.Request.RawUrlWithoutQuery.Replace(path, "");
            var url = _cDragonBaseUrl + requested;
            var cacheUri = Path.Join(GetApplicationPath(),"cache",requested);

            Directory.CreateDirectory(Path.GetDirectoryName(cacheUri));

            if (!File.Exists(cacheUri))
            {
                WebClient wc = new WebClient();
                var uri = Path.GetFullPath(cacheUri);
                Console.WriteLine(uri);
                try
                {
                    wc.DownloadFile(url, uri);
                }
                catch (Exception e)
                {
                    Console.WriteLine(e);
                }
                Console.WriteLine("Downloaded " + url);
                wc.Dispose();
            }

            await ctx.Response.Send(File.ReadAllBytes(cacheUri));

            return;
        }

        public override string GetName()
        {
            return "cache_dragon";
        }

        public override void Load(LWOServer s)
        {
            _server = s;
            _server.WebServer.DynamicRoutes.Add(HttpMethod.GET, _cdragonRegex, CDragonHandler);

            Console.WriteLine("Cache Dragon reachable under " + path);
        }

        public override void Start()
        {
            throw new NotImplementedException();
        }

        public override string StatusHtml()
        {
            throw new NotImplementedException();
        }

        public override string StatusString()
        {
            throw new NotImplementedException();
        }

        public override void Stop()
        {
            throw new NotImplementedException();
        }

        public override void Unload()
        {
            _server.WebServer.DynamicRoutes.Remove(HttpMethod.GET, _cdragonRegex);  
        }
    }
}
