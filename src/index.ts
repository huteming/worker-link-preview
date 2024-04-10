/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import handleOptions from './handleOptions'
import { decodeHTML } from './utils'

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method.toLowerCase() === 'options') {
			return handleOptions(request)
		}

		const url = new URL(request.url)
		const isValidRequest = url.pathname.startsWith('/api')

		if (!isValidRequest) {
			return createResponse(404, 'Not Found')
		}

		const link = url.searchParams.get('link')

		if (!link) {
			return createResponse(400, '缺少查询参数 link')
		}

		try {
			// @ts-ignore
			const response: Response = await fetch(link)
			const contentType = response.headers.get('Content-Type')

			if (!contentType?.startsWith('text/html')) {
				return response
			}

			const metaReader = new MetaReader()
			const res = new HTMLRewriter().on('meta', metaReader).transform(response)

			await res.text()

			return createResponse(200, metaReader.metadata)
		} catch (err: any) {
			console.error(err)
			return createResponse(500, err.message)
		}
	},
}

function createResponse(status: number, data: object | string | null) {
	const res =
		typeof data === 'string'
			? {
					code: status,
					data: null,
					message: data,
			  }
			: {
					code: status,
					data,
					message: 'success',
			  }

	return new Response(JSON.stringify(res), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
			// Append to/Add Vary header so browser will cache response correctly
			'Vary': 'Origin',
		},
	})
}

interface IMetadataOG {
	image?: string
	title?: string
	description?: string
	url?: string
	site_name?: string
}

interface IMetadata {
	og?: IMetadataOG

	image?: string
	title?: string
	description?: string
}

class MetaReader {
	metadata: IMetadata | null = null

	element(element: Element) {
		const name = element.getAttribute('name')
		const property = element.getAttribute('property')
		const content = element.getAttribute('content')
		const metaName = name || property

		if (!metaName || !content) {
			return
		}

		const metaContent = decodeHTML(content)

		/**
		 * https://github.com/nasa8x/html-metadata-parser
		 */
		this._tryReadSiteData(metaName, metaContent)
		this._tryReadAsOG(metaName, metaContent)
	}

	private _tryReadAsOG(name: string, content: string): void {
		const names = ['og:title', 'og:description', 'og:image', 'og:url', 'og:site_name', 'og:type']
		if (!names.includes(name)) {
			return
		}

		const key = name.split(':')[1] as keyof IMetadataOG
		if (!this.metadata) {
			this.metadata = {}
		}
		if (!this.metadata.og) {
			this.metadata.og = {}
		}
		this.metadata.og[key] = content
	}

	private _tryReadSiteData(name: string, content: string): void {
		const names = ['title', 'description', 'image']
		if (!names.includes(name)) {
			return
		}

		const key = name as keyof IMetadata
		if (!this.metadata) {
			this.metadata = {}
		}
		this.metadata[key] = content
	}
}
