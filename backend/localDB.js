const fs = require('fs')
const path = require('path')

const db_Path = path.join(__dirname,'db.json')

function getLocalDB() {
    const data = fs.readFileSync(db_Path)
    return JSON.parse(data)
}

function saveLocalDB(newData) {
    fs.writeFileSync(db_Path,JSON.stringify(newData,null,2))
}

module.exports = {getLocalDB, saveLocalDB}