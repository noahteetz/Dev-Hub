import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const backend = fileURLToPath(new URL('../backend/', import.meta.url))
const windows = process.platform === 'win32'
const development = process.argv.includes('bootRun')
if (development) {
  try {
    process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}
const child = spawn(windows ? 'gradlew.bat' : './gradlew', process.argv.slice(2), {
  cwd: backend,
  stdio: 'inherit',
  shell: windows,
  env: development
    ? {
        ...process.env,
        DEVHUB_AUTH_ENABLED: process.env.DEVHUB_AUTH_ENABLED ?? 'false',
        DATABASE_URL: process.env.DATABASE_URL ?? `jdbc:postgresql://localhost:5432/${process.env.POSTGRES_DB ?? 'devhub'}`,
        DATABASE_USERNAME: process.env.DATABASE_USERNAME ?? process.env.POSTGRES_USER ?? 'devhub',
        DATABASE_PASSWORD: process.env.DATABASE_PASSWORD ?? process.env.POSTGRES_PASSWORD ?? 'devhub',
      }
    : process.env,
})

child.on('error', error => {
  console.error(`Could not start Gradle: ${error.message}`)
  process.exitCode = 1
})
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exitCode = code ?? 1
})
