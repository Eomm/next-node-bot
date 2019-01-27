'use strict'

const Octokit = require('@octokit/rest')
const { spawn } = require('child_process')
const { join } = require('path')

const util = require('util')
const setTimeoutPromise = util.promisify(setTimeout)

const config = require('./config/bot.json')

const githubClient = new Octokit({
  auth: `token ${config.token}`
})

// a repo with old constructor new Buffer
const repo = {
  owner: 'ZECTBynmo',
  repo: 'tacnode'
  //  organization:
}

fork(githubClient, repo)
  .then((response) => {
    console.log(JSON.stringify(response, null, 2))
    return waitFork(response.data)
  })
  .then((data) => clone(data.git_url, config.cloneDirectory))
  .then((data) => updateSourceCode(join(config.cloneDirectory, data.name)))
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
      return githubClient.request(`HEAD ${gitData.url}`)
        .catch(err => {
          if (tentative < maxRetry) {
            tentative++
            return setTimeoutPromise(retryAfter)
              .then(() => checkStatus())
          }
          throw err
        })
    }

    checkStatus()
      .then(resolve)
      .catch(reject)
  })
}

function clone (gitUrl, to) {
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
  console.log(directory)
  // TODO search for .js file to update
}
