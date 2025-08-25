/**
 * @description Get the reading time of an article
 * @param {*} body
 * @returns {number} readTime
 */
export const getArticleReadingTime = (body) => {
	// Add error handling for undefined/null body
	if (!body || typeof body !== 'string') {
		return 1; // Default to 1 minute for empty content
	}
	
	const wordsPerMinute = 183;
	const numberOfWords = body.split(/\s/g).length;
	const minutes = numberOfWords / wordsPerMinute;
	const readTime = Math.ceil(minutes);
	
	// Ensure minimum of 1 minute
	return Math.max(1, readTime);
};
