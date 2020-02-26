using System;
using System.Collections.Generic;
using System.Text;

namespace LightWeightOverlay.Applications
{
    public interface IApp 
    {
        void Load(LWOServer s);
        void Start();
        void Stop();
        void Unload();

        String StatusHtml();
        String StatusString();
    }
}
