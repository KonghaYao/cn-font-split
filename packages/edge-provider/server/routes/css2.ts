import { FontCSSAPI } from "~/src";

export default eventHandler(async (event) => {
  const url = await new FontCSSAPI('https://play.min.io:9000/result-font').main(getRequestURL(event))
  return new Response(url)
});
