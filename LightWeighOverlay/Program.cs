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
    public class AppConfiguration
    {
        public int WebsocketPort { get; set; }
        public int WebserverPort
        {
            get; set;
        }
        public String IP { get; set; }
    }
 
    public class Message
    {
        public String Type { get; set; }
        public String Path { get; set; }
        public String Content { get; set; }
    }

    class Program
    {

        static void Main(string[] args)
        {
            var server = new LWOServer("settings.json", "globalstate.json");

            Console.WriteLine("Press Enter to stop server");
            Console.ReadLine();
        }



 
    }
}
