/** Minimal SMTP server with AUTH LOGIN/PLAIN, used to exercise the real mailer path. */
import net from 'net'

export interface Captured { from: string; to: string[]; data: string; authUser?: string; authPass?: string }

export function startFakeSmtp(port: number, opts: { expectUser: string; expectPass: string }) {
  const received: Captured[] = []
  const server = net.createServer((sock) => {
    let state: 'cmd' | 'data' | 'authuser' | 'authpass' = 'cmd'
    let cur: Captured = { from: '', to: [], data: '' }
    let buf = ''
    let authed = false

    const send = (s: string) => sock.write(s + '\r\n')
    send('220 fake.smtp ESMTP ready')

    sock.on('data', (chunk) => {
      buf += chunk.toString()
      let idx
      while ((idx = buf.indexOf('\r\n')) !== -1) {
        const line = buf.slice(0, idx)
        buf = buf.slice(idx + 2)

        if (state === 'data') {
          if (line === '.') { received.push(cur); cur = { from: '', to: [], data: '', authUser: cur.authUser, authPass: cur.authPass }; state = 'cmd'; send('250 2.0.0 Ok: queued as FAKE1') }
          else cur.data += line + '\n'
          continue
        }
        if (state === 'authuser') { cur.authUser = Buffer.from(line, 'base64').toString(); state = 'authpass'; send('334 UGFzc3dvcmQ6'); continue }
        if (state === 'authpass') {
          cur.authPass = Buffer.from(line, 'base64').toString()
          state = 'cmd'
          if (cur.authUser === opts.expectUser && cur.authPass === opts.expectPass) { authed = true; send('235 2.7.0 Authentication successful') }
          else send('535 5.7.8 Authentication credentials invalid')
          continue
        }

        const cmd = line.toUpperCase()
        if (cmd.startsWith('EHLO') || cmd.startsWith('HELO')) { send('250-fake.smtp'); send('250-AUTH PLAIN LOGIN'); send('250 8BITMIME') }
        else if (cmd.startsWith('AUTH LOGIN')) { state = 'authuser'; send('334 VXNlcm5hbWU6') }
        else if (cmd.startsWith('AUTH PLAIN')) {
          const parts = Buffer.from(line.split(' ')[2] || '', 'base64').toString().split('\0')
          cur.authUser = parts[1]; cur.authPass = parts[2]
          if (cur.authUser === opts.expectUser && cur.authPass === opts.expectPass) { authed = true; send('235 2.7.0 Authentication successful') }
          else send('535 5.7.8 Authentication credentials invalid')
        }
        else if (cmd.startsWith('MAIL FROM')) { if (!authed) { send('530 5.7.0 Authentication required'); continue } cur.from = line.slice(line.indexOf(':') + 1).trim(); send('250 2.1.0 Ok') }
        else if (cmd.startsWith('RCPT TO')) { cur.to.push(line.slice(line.indexOf(':') + 1).trim()); send('250 2.1.5 Ok') }
        else if (cmd === 'DATA') { state = 'data'; send('354 End data with <CR><LF>.<CR><LF>') }
        else if (cmd === 'QUIT') { send('221 2.0.0 Bye'); sock.end() }
        else if (cmd === 'RSET') { cur = { from: '', to: [], data: '' }; send('250 2.0.0 Ok') }
        else send('250 2.0.0 Ok')
      }
    })
    sock.on('error', () => {})
  })

  return new Promise<{ received: Captured[]; close: () => Promise<void> }>((resolve) => {
    server.listen(port, '127.0.0.1', () =>
      resolve({ received, close: () => new Promise<void>((r) => { server.close(() => r()); server.unref() }) })
    )
  })
}
