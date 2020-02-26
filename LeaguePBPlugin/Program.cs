using LCUSharp;
using LCUSharp.Websocket;
using LoLApi;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using WatsonWebsocket;

using Action = LoLApi.Action;

namespace LeaguePBPlugin
{

    class Event
    {
        public String Type { get; set; }
    }

    class GameFlow : Event
    {
        public String State { get; set; }
        public GameFlow()
        {
            Type = "GameFlow";
        }
    }

    enum SelectionState
    {
        Hover,
        Lock
    }

    class Phase : Event
    {
        public Phase()
        {
            Type = "PBPhase";
        }

        public int FloatingPicks;
        public int FloatingBans;
        public long PickTurn;
        public long PhaseCount;
    }

    class PickBan : Event
    {
        public long PickTurn { get; set; }
        public Summoner Summoner { get; set; }
        public long ChampionId { get; set; }
        public Player Player { get; set; }
        public SelectionState SelectionState { get; set; }
    }

    class Message
    {
        public String Type { get; set; }
        public String Content { get; set; }
        public String Path { get; set; }
    }

    

    class Program
    {
        static int i = 0;


        public static event EventHandler<LeagueEvent> GameFlowChanged;
        private static readonly TaskCompletionSource<bool> _work = new TaskCompletionSource<bool>(false);

        static LeagueClientApi api;

        public static async Task EventExampleAsync()
        {
            // Initialize a connection to the league client.
            api = await LeagueClientApi.ConnectAsync();
            Console.WriteLine("Connected!");

            api.EventHandler.Subscribe("/lol-gameflow/v1/gameflow-phase", OnGameFlowChanged);

            api.EventHandler.Subscribe("/lol-champ-select/v1/session", OnSessionChanged);

            api.EventHandler.Subscribe("/lol-gameflow/v1/session", OnGameflowSessionChanged);

            // Wait until work is complete.
            await _work.Task;
            Console.WriteLine("Done.");
        }

        static bool unknownSummoners = true;

        private static void OnGameflowSessionChanged(object sender, LeagueEvent e)
        {
            var result = e.Data.ToString();
            var state = string.Empty;

            //File.WriteAllText($"events/{i++}_gameflow_session.json", result);

            /*if (result != "ChampSelect")
                LastSession = null;

            var msg = new Message() { MessageType = "LoL", Events = new List<Event>() { new GameFlow() { State = result } } };
            ws.SendAsync(Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(msg)));*/

            _work.SetResult(true);
        }

        private static void OnGameFlowChanged(object sender, LeagueEvent e)
        {
            var result = e.Data.ToString();
            var state = string.Empty;

            //File.WriteAllText($"events/{i++}_gameflow.json", result);

            if (result != "ChampSelect")
                LastSession = null;

            /*var msg = new Message() { MessageType = "LoL", Events = new List<Event>() { new GameFlow() { State = result } } };
            ws.SendAsync(Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(msg)));*/

            _work.SetResult(true);           
        }

        static Session LastSession = null;

        static Dictionary<long, Summoner> Summoners = new Dictionary<long, Summoner>();


        

        private static bool CompareActions(Action a1, Action a2)
        {
            if (a2 == null)
                return true;

            return a1.ChampionId != a2.ChampionId || a1.Completed != a2.Completed || a1.IsInProgress != a2.IsInProgress;
        }

        private static Event ActionToEvent(Session session, Action a1, int floatingBans, int floatingPicks)
        {       
            var player = session.TheirTeam.Concat(session.MyTeam).First( x => x.CellId == a1.ActorCellId);

            var summoner = Summoners.ContainsKey(player.SummonerId) ? Summoners[player.SummonerId] : new Summoner() { SummonerId = 0, DisplayName = $"Summoner {player.CellId}" };

            return new PickBan() { ChampionId = a1.ChampionId, Player = player, SelectionState = a1.Completed ? SelectionState.Lock : SelectionState.Hover, Summoner = summoner, Type = a1.Type, PickTurn = a1.PickTurn };
        }

        private static void OnSessionChanged(object sender, LeagueEvent e)
        {
            var result = e.Data.ToString();
            var state = string.Empty;
            List<Event> events = new List<Event>();

            var msg = new Message() { Type = "Update", Content = e.Data.ToString(), Path = "lolChampSelect/session" };

            var session = Session.FromJson(result);

            var newSummoner = false;

            foreach (var p in session.MyTeam.Concat(session.TheirTeam))
            {
                if (p.SummonerId == 0 || Summoners.ContainsKey(p.SummonerId))
                    continue;

                var task = api.RequestHandler.GetJsonResponseAsync(HttpMethod.Get, $"/lol-summoner/v1/summoners/{p.SummonerId}");
                task.Wait();
                Summoners[p.SummonerId] = Summoner.FromJson(task.Result);
                newSummoner = true;
            }

            var msg2 = new Message() { Type = "Update", Content = JsonConvert.SerializeObject(Summoners), Path = "lolChampSelect/summoners" };

            if (newSummoner) ws.SendAsync(Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(msg2)));

            ws.SendAsync(Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(msg)));

        }

        static WatsonWsClient ws;

        static void Main(string[] args)
        {

            while (true)
            {
                try { 
                    ws = new WatsonWsClient("127.0.0.1", 9346, false);
                    ws.Start();
                    //ws.SendAsync(Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(new Message() { MessageType = "Update", })));
                    EventExampleAsync().Wait();
                    Console.ReadKey();
                } catch
                {

                } finally
                {
                    Thread.Sleep(1000);
                }
            }

        }
    }
}
