using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace LightWeightOverlay.Applications
{
    public abstract class AApplication 
    {
        protected LWOServer _server;

        public abstract String GetName();
        public abstract void Load(LWOServer s);
        public abstract void Start();
        public abstract void Stop();
        public abstract void Unload();

        public abstract String StatusHtml();
        public abstract String StatusString();

        public String GetApplicationPath()
        {
            return Path.Join(_server.AppDirectory,GetName());
        }
    }
}
