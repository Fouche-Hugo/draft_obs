using LightWeightOverlay;
using LightWeightOverlay.Applications;
using System;
using System.Threading.Tasks;
using WatsonWebserver;

namespace lol_picksandbans
{
    public class PicksAndBans : IApp
    {
        LWOServer _server;
        LCUHook _hook;

        SpecialRouteProcessor pbRoute;

        public void Load(LWOServer s)
        {

            _server = s;
            _hook = new LCUHook(_server);

            _hook.ConnectToLeague();

            pbRoute = new SpecialRouteProcessor("/lol_picksandbans/", "apps/lol_picksandbans/web/");
            pbRoute.AddToWebserver(s.WebServer);

            Console.WriteLine("Pick&Ban Overlay reachable under: /lol_picksandbans/");
        }

        private Task RequestHandler(HttpContext arg)
        {
            return pbRoute.Process(arg);
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
            if (_hook.currentAPI != null)
                _hook.currentAPI.Disconnect();
        }




    }
}
