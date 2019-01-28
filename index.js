'use strict'

const Octokit = require('@octokit/rest')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const util = require('util')
const setTimeoutPromise = util.promisify(setTimeout)

const config = require('./config/bot.json')

const githubClient = new Octokit({
  auth: `token ${config.token}`
})

// a repo with old constructor new Buffer
const repo = {
  owner: 'soldair',
  repo: 'node-buffer-indexof'
  //  organization:
}

fork(githubClient, repo)
  .then((response) => {
    console.log(JSON.stringify(response, null, 2))
    return waitFork(response.data)
  })
  .then((data) => clone(data.git_url, `${config.cloneDirectory}${data.name}`)
    .then(() => data))
  .then((data) => updateSourceCode(path.join(config.cloneDirectory, data.name)))
  .then(() => console.log('Completed'))
  .catch(err => console.log('Somethink went wrong', err))

function fork (octokit, repo) {
  return octokit.repos.createFork(repo)
  // TODO manage response
}

function waitFork (gitData) {
  const maxRetry = 5
  const retryAfter = 1000

  return new Promise((resolve, reject) => {
    let tentative = 0
    const checkStatus = () => {
      console.log(gitData.url)
      return githubClient.request(`HEAD ${gitData.url}`)
        .catch(err => {
          if (tentative < maxRetry) {
            console.log('Retry', tentative)
            tentative++
            return setTimeoutPromise(retryAfter)
              .then(() => checkStatus())
          }
          throw err
        })
    }

    checkStatus()
      .then(() => resolve(gitData))
      .catch(reject)
  })
}

function clone (gitUrl, to) {
  console.log('clone', gitUrl, to)
  return new Promise((resolve, reject) => {
    const gitCommand = spawn('git', ['clone', gitUrl, to])
    gitCommand.stdout.setEncoding('utf8')
    gitCommand.stdout.pipe(process.stdout)
    gitCommand.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      // TODO
      reject(code)
    })
  })
}

function updateSourceCode (directory) {
  console.log('walking', directory)
  for (const file of walkSync(directory, (path) => path.endsWith('.js'))) {
    // TODO pipeline
    console.info(file)
  }
}

// https://gist.github.com/luciopaiva/4ba78a124704007c702d0293e7ff58dd
function * walkSync (dir, filter) {
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const pathToFile = path.join(dir, file)
    const isDirectory = fs.statSync(pathToFile).isDirectory()
    if (isDirectory) {
      yield * walkSync(pathToFile, filter)
    } else {
      if (filter === undefined || filter(pathToFile) === true) {
        yield pathToFile
      }
    }
  }
}
