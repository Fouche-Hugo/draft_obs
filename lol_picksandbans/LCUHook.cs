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
        //private  readonly TaskCompletionSource<bool> _work = new TaskCompletionSource<bool>(false);

        public LeagueClientApi currentAPI;

        public  async Task ConnectToLeague()
        {
            // Initialize a connection to the league client.
            currentAPI = await LeagueClientApi.ConnectAsync();
            Console.WriteLine("Connected to League Client!");

            currentAPI.EventHandler.Subscribe("/lol-gameflow/v1/gameflow-phase", OnGameFlowChanged);

            currentAPI.EventHandler.Subscribe("/lol-champ-select/v1/session", OnSessionChanged);

            currentAPI.EventHandler.Subscribe("/lol-gameflow/v1/session", OnGameflowSessionChanged);

            currentAPI.Disconnected += CurrentAPI_Disconnected;


        }

        private void CurrentAPI_Disconnected(object sender, EventArgs e)
        {
            Console.WriteLine("Disconnected from League Client!");
            currentAPI.Disconnected -= CurrentAPI_Disconnected;
            ConnectToLeague();
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

        }

        private  void OnGameFlowChanged(object sender, LeagueEvent e)
        {
            var result = e.Data.ToString();
            var state = string.Empty;

            //File.WriteAllText($"events/{i++}_gameflow.json", result);

            /*var msg = new Message() { MessageType = "LoL", Events = new List<Event>() { new GameFlow() { State = result } } };
            ws.SendAsync(Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(msg)));*/

        }

         Dictionary<long, Summoner> Summoners = new Dictionary<long, Summoner>();

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

                var task = currentAPI.RequestHandler.GetJsonResponseAsync(HttpMethod.Get, $"/lol-summoner/v1/summoners/{p.SummonerId}");
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
