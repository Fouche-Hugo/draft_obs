using LCUSharp;
using LCUSharp.Websocket;
using LightWeightOverlay;
using LoLApi;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Action = LoLApi.Action;

namespace lol_picksandbans
{
    public class LCUHook
    {
        public LCUHook(LWOServer s)
        {
            _server = s;
        }


         int i = 0;

        private LWOServer _server;

        public  event EventHandler<LeagueEvent> GameFlowChanged;
        private  readonly TaskCompletionSource<bool> _work = new TaskCompletionSource<bool>(false);

        LeagueClientApi api;

        public  async Task ConnectToLeague()
        {
            // Initialize a connection to the league client.
            api = await LeagueClientApi.ConnectAsync();
            Console.WriteLine("Connected to League!");

            api.EventHandler.Subscribe("/lol-gameflow/v1/gameflow-phase", OnGameFlowChanged);

            api.EventHandler.Subscribe("/lol-champ-select/v1/session", OnSessionChanged);

            api.EventHandler.Subscribe("/lol-gameflow/v1/session", OnGameflowSessionChanged);

            // Wait until work is complete.
            await _work.Task;
            Console.WriteLine("Listening to LCU");
        }

         bool unknownSummoners = true;

        private  void OnGameflowSessionChanged(object sender, LeagueEvent e)
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

        private  void OnGameFlowChanged(object sender, LeagueEvent e)
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

         Session LastSession = null;

         Dictionary<long, Summoner> Summoners = new Dictionary<long, Summoner>();

        private  bool CompareActions(Action a1, Action a2)
        {
            if (a2 == null)
                return true;

            return a1.ChampionId != a2.ChampionId || a1.Completed != a2.Completed || a1.IsInProgress != a2.IsInProgress;
        }

        private  void OnSessionChanged(object sender, LeagueEvent e)
        {
            var result = e.Data.ToString();
            var state = string.Empty;

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
            if (newSummoner)
                _server.State.UpdatePath("lolChampSelect/summoners", Summoners);

            _server.State.UpdatePath("lolChampSelect/session", JsonHelper.Deserialize(e.Data.ToString()));
        }
    }
}
