const algorithmia = require('algorithmia')
const algorithmiaApiKey = require('../credentials/algorithmia.json').apiKey
const sentenceBoundaryDetection = require('sbd')

const watsonApiKey = require('../credentials/watson-nlu.json').apikey
const watsonUsername = require('../credentials/watson-nlu.json').username
const watsonPassword = require('../credentials/watson-nlu.json').password
const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js')

const nlu = new NaturalLanguageUnderstandingV1({
    username: watsonUsername,
    password: watsonPassword,
    iam_apikey: watsonApiKey,
    version: '2020-04-04',
    url: "https://api.eu-gb.natural-language-understanding.watson.cloud.ibm.com/instances/430e9757-f4d0-40b0-b8fd-f665a274c6c9",
  })

const state = require('./state.js')
  /*
nlu.analyze({
    text:`Hi I am Michael Jackson and I like doing the moonwalk dance move`,
    features: {
        keywords: {},
        emotion: {}
    }
}, (error, response) => {
    if (error) {
        console.log('Watson Erro')
        throw error
    }

    console.log('Watson Teste')
    console.log(JSON.stringify(response, null,4))
    process.exit(0)
})
*/


async function robot() {
    const content = state.load()

    await fetchContentFromWikipedia(content)
    sanitizeContent(content)
    breakContentIntoSentences(content)
    limitMaximumSentences(content)
    await fetchKeywordsOfAllSentences(content)

    state.save(content)

    async function fetchContentFromWikipedia(content){
        const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey)
        const wikipediaAlgorithm = algorithmiaAuthenticated.algo('web/WikipediaParser/0.1.2')
        const wikipediaResponde = await wikipediaAlgorithm.pipe(content.searchTerm)
        const wikipediaContent = wikipediaResponde.get()

        content.sourceContentOriginal = wikipediaContent.content


    }

    function sanitizeContent(content){
        const withoutBlankLinesAndMarkdown = removeBlankLinesAndMarkdown(content.sourceContentOriginal)
        const withoutDatesInParentheses = removeDatesInParentheses(withoutBlankLinesAndMarkdown)

        
        content.sourceContentSanitized = withoutDatesInParentheses
      
        function removeBlankLinesAndMarkdown(text){
            const allLines = text.split('\n')

            const withoutBlankLinesAndMarkdown = allLines.filter((line) => {
                if (line.trim().length === 0 || line.trim().startsWith('=')) {
                    return false
                }

                return true
            })

            return withoutBlankLinesAndMarkdown.join(' ')
        }
    }

    function removeDatesInParentheses(text) {
        return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm, '').replace(/  /g,' ')
    }

    function breakContentIntoSentences(content){
        content.sentences = []

        const sentences = sentenceBoundaryDetection.sentences(content.sourceContentSanitized)
        sentences.forEach((sentence) => {
            content.sentences.push({
                text: sentence,
                keywords: [],
                images:[]
            })
        })
    }

    function limitMaximumSentences(content) {
        content.sentences = content.sentences.slice(0,content.maximumSentences)
    }

    
    async function fetchKeywordsOfAllSentences(content) {
        for (const sentence of content.sentences) {
            sentence.keywords = await fetchWatsonAndReturnKeywords(sentence.text)
        }
    }
    

    async function fetchWatsonAndReturnKeywords(sentence) {
        return new Promise ((resolve, reject) => {
            nlu.analyze({
                text: sentence,
                features: {
                    keywords: {}
                }
            }, (error, response) => {
                if (error) {
                    reject(error)
                    return
                }

                const keywords = response.keywords.map((keyword) => {
                    return keyword.text  
                })

                resolve(keywords)
            })
        })
    }
}

module.exports = robot
