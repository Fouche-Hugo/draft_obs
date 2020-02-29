using LightWeightOverlay;
using System;

namespace LWOServ
{
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
