using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using WatsonWebsocket;

namespace LightWeightOverlay
{
    public class SharedState : Dictionary<string, object>
    {
        public String Path { get; set; } = "globalstate.json";

        private static String ToInternalPath(string path)
        {
            return path.Replace("[", "/").Replace("]", "");
        }

        public static bool ComparePaths(string path1, string path2)
        {
            var p1 = ToInternalPath(path1);
            var p2 = ToInternalPath(path2);

            var p1Splits = p1.Split("/");
            var p2Splits = p2.Split("/");

            var shorter = p1.Length < p2.Length ? p1 : p2;
            var longer = shorter == p1 ? p2 : p1;

            for(int i = 0; i < shorter.Length; i++)
            {
                if (shorter[i] != longer[i])
                    return false;
            }

            return true;
        }

        public static SharedState FromJson(String path)
        {
            var json = File.ReadAllText(path);
            var s = new SharedState();
            s.Path = path;

            var dict = JsonHelper.Deserialize(json) as Dictionary<string , object>;

            foreach(var k in dict.Keys)
            {
                s[k] = dict[k];
            }

            return s;
        }

        public object RetrievePath(String path, bool parent = false, bool createMissing = false)
        {
            path = ToInternalPath(path);
            var splits = path.Split("/");

            dynamic current = this;
            int o;

            for (int i = 0; i < splits.Length - (parent ? 1 : 0); i++)
            {
                dynamic currentLeg = splits[i];

                if (int.TryParse(splits[i], out o))
                    currentLeg = o;

                if (current is List<object> ? current.Count <= currentLeg : !current.ContainsKey(currentLeg))
                {
                    if (!createMissing)
                    {
                        //Object doesnt exist and were not creating
                        return null;
                    }
                    else
                    {
                        //Object doesnt exist but we are creating
                        current[currentLeg] = new Dictionary<string, object>();
                    }
                }


                current = current[currentLeg];
            }

            return current;
        }

        public Message UpdatePath(String path, object value, WatsonWsServer broadcast = null)
        {
            var splits = path.Split("/");
            var lastLeg = splits[splits.Length - 1];
            //basically
            var parent = RetrievePath(path, true, true) as IDictionary<string, object>;
            parent[lastLeg] = value;

            return new Message() { Path = path, Content = JsonConvert.SerializeObject(value), Type = "Update" }; ;
        }

        public void Save()
        {
            File.WriteAllText(Path, JsonConvert.SerializeObject(this, Formatting.Indented));
        }
    }
}
