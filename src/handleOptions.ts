/**
 * https://developers.cloudflare.com/workers/examples/cors-header-proxy/
 */
export default async function handleOptions(request: Request): Promise<Response> {
	const accessHeaders = request.headers.get('Access-Control-Request-Headers')

	if (
		request.headers.get('Origin') !== null &&
		request.headers.get('Access-Control-Request-Method') !== null &&
		accessHeaders !== null
	) {
		// Handle CORS preflight requests.
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
			'Access-Control-Max-Age': '86400',
		}

		return new Response(null, {
			headers: {
				...corsHeaders,
				'Access-Control-Allow-Headers': accessHeaders,
			},
		})
	}

	// Handle standard OPTIONS request.
	return new Response(null, {
		headers: {
			Allow: 'GET, HEAD, POST, OPTIONS',
		},
	})
}
