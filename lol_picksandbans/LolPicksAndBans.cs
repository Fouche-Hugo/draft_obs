using LightWeightOverlay;
using LightWeightOverlay.Applications;
using System;
using System.Threading;
using System.Threading.Tasks;
using WatsonWebserver;

namespace lol_picksandbans
{
    public class PicksAndBans : AApplication
    {
        LCUHook _hook;

        SpecialRouteProcessor pbRoute;

        public override void Load(LWOServer s)
        {

            _server = s;
            _hook = new LCUHook(_server);

            // new Thread(() => { _hook.PlaybackSessionlog(); }).Start();
            

            pbRoute = new SpecialRouteProcessor("/lol_picksandbans/", "apps/lol_picksandbans/web/");
            pbRoute.AddToWebserver(s.WebServer);

            _hook.ConnectToLeague();

            Console.WriteLine("Pick&Ban Overlay reachable under: /lol_picksandbans/");
        }

        private Task RequestHandler(HttpContext arg)
        {
            return pbRoute.Process(arg);
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
            if (_hook.currentAPI != null)
                _hook.currentAPI.Disconnect();
        }

        public override string GetName()
        {
            return "lol_picksandbans";
        }



    }
}
