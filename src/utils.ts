/**
 * https://github.com/mathiasbynens/he
 */
export function decodeHTML(str: string) {
	return str.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}
