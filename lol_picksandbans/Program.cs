using LightWeightOverlay;
using LightWeightOverlay.Applications;
using System;

namespace lol_picksandbans
{
    public class PicksAndBans : IApp
    {
        LWOServer _server;

        public void Load(LWOServer s)
        {
            _server = s;
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
            throw new NotImplementedException();
        }




    }
}
