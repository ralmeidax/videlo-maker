const fs = require('fs')
const contentFilePath = './content.json'

function save(content) {
    const contentString = JSON.stringify(content)
    return fs.writeFileSync(contentFilePath, contentString)
}

function load(){
    const fileBuffer = fs.readFileSync(contentFilePath, 'utf-8')
    const contentJson = JSON.parse(fileBuffer)
    return contentJson
}

function load2() {
    return require('./content.json') 
    /* O node carregará esta informação sempre na memória, desta forma, mesmo
       se aleterarmos o arquivo, o conteúdo da memória será carregado.
    */
}
module.exports = {
    save,
    load
}