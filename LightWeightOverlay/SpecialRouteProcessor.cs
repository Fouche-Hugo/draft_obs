using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using WatsonWebserver;

namespace LightWeightOverlay
{
    public class SpecialRouteProcessor
    {
        String Path;
        String MapTo;
        public SpecialRouteProcessor(String path, String mapTo)
        {
            Path = path;
            MapTo = mapTo;
        }

        /// <summary>
        /// The FileMode value to use when accessing files within a content route via a FileStream.  Default is FileMode.Open.
        /// </summary>
        public FileMode ContentFileMode = FileMode.Open;

        public void AddToWebserver(Server webServer)
        {
            webServer.DynamicRoutes.Add(HttpMethod.GET, new Regex(Path), (ctx) => { return Process(ctx); });
        }

        public void RemoveFromWebserver(Server webServer)
        {
            webServer.DynamicRoutes.Remove(HttpMethod.GET, new Regex(Path));
        }

        /// <summary>
        /// The FileAccess value to use when accessing files within a content route via a FileStream.  Default is FileAccess.Read.
        /// </summary>
        public FileAccess ContentFileAccess = FileAccess.Read;

        /// <summary>
        /// The FileShare value to use when accessing files within a content route via a FileStream.  Default is FileShare.Read.
        /// </summary>
        public FileShare ContentFileShare = FileShare.Read;
        private string GetContentType(string path)
        {
            if (String.IsNullOrEmpty(path)) return "application/octet-stream";

            int idx = path.LastIndexOf(".");
            if (idx >= 0)
            {
                return MimeTypes.GetFromExtension(path.Substring(idx));
            }

            return "application/octet-stream";
        }

        private void Set204Response(HttpContext ctx)
        {
            ctx.Response.StatusCode = 204;
            ctx.Response.ContentLength = 0;
        }

        private void Set404Response(HttpContext ctx)
        {
            ctx.Response.StatusCode = 404;
            ctx.Response.ContentLength = 0;
        }

        private void Set500Response(HttpContext ctx)
        {
            ctx.Response.StatusCode = 500;
            ctx.Response.ContentLength = 0;
        }




        public  async Task Process(HttpContext ctx)
        {
            if (ctx == null) throw new ArgumentNullException(nameof(ctx));
            if (ctx.Request == null) throw new ArgumentNullException(nameof(ctx.Request));
            if (ctx.Response == null) throw new ArgumentNullException(nameof(ctx.Response));

            if (ctx.Request.Method != HttpMethod.GET
                && ctx.Request.Method != HttpMethod.HEAD)
            {
                Set500Response(ctx);
                await ctx.Response.Send();
                return;
            }

            string filePath = ctx.Request.RawUrlWithoutQuery;
            filePath = filePath.Replace(Path, MapTo);
            if (!String.IsNullOrEmpty(filePath))
            {
                while (filePath.StartsWith("/")) filePath = filePath.Substring(1);
            }

            string baseDirectory = AppDomain.CurrentDomain.BaseDirectory;
            baseDirectory = baseDirectory.Replace("\\", "/");
            if (!baseDirectory.EndsWith("/")) baseDirectory += "/";

           

            filePath = baseDirectory + filePath;
            filePath = filePath.Replace("+", " ").Replace("%20", " ");

            string contentType = GetContentType(filePath);

            if (!File.Exists(filePath))
            {
                Set404Response(ctx);
                await ctx.Response.Send();
                return;
            }

            FileInfo fi = new FileInfo(filePath);
            long contentLength = fi.Length;

            if (ctx.Request.Method == HttpMethod.GET)
            {
                FileStream fs = new FileStream(filePath, ContentFileMode, ContentFileAccess, ContentFileShare);
                ctx.Response.StatusCode = 200;
                ctx.Response.ContentLength = contentLength;
                ctx.Response.ContentType = GetContentType(filePath);
                await ctx.Response.Send(contentLength, fs);
                return;
            }
            else if (ctx.Request.Method == HttpMethod.HEAD)
            {
                ctx.Response.StatusCode = 200;
                ctx.Response.ContentLength = contentLength;
                ctx.Response.ContentType = GetContentType(filePath);
                await ctx.Response.Send(contentLength);
                return;
            }
            else
            {
                Set500Response(ctx);
                await ctx.Response.Send();
                return;
            }
        }
    }
}
