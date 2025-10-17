export interface DetectRuleFixture {
  name: string
  yaml: string
}

const trim = (input: string) => {
  const withoutBlankEdges = input.replace(/^\n+|\n+$/g, '')
  const lines = withoutBlankEdges.split('\n')
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.match(/^\s*/)?.[0].length ?? 0)
  const minIndent = indents.length > 0 ? Math.min(...indents) : 0
  return lines
    .map((line) => line.slice(minIndent))
    .join('\n')
}

export const validDetectRuleFixtures: DetectRuleFixture[] = [
  {
    name: 'Windows Sdclt Child Process',
    yaml: trim(`
      events:
        - NEW_PROCESS
        - EXISTING_PROCESS
      op: and
      rules:
        - op: is platform
          name: windows
        - case sensitive: false
          op: is
          path: event/FILE_PATH
          value: sdclt.exe
    `),
  },
  {
    name: 'Suspicious PowerShell Parent Chain',
    yaml: trim(`
      event: WEL
      op: and
      rules:
        - op: and
          rules:
            - case sensitive: false
              op: is
              path: event/EVENT/System/_event_id
              value: '1'
            - case sensitive: false
              op: is
              path: event/EVENT/System/Channel
              value: Microsoft-Windows-Sysmon/Operational
        - op: and
          rules:
            - op: or
              rules:
                - case sensitive: false
                  op: ends with
                  path: event/EVENT/EventData/ParentImage
                  value: \\wscript.exe
                - case sensitive: false
                  op: ends with
                  path: event/EVENT/EventData/ParentImage
                  value: \\cscript.exe
            - case sensitive: false
              op: ends with
              path: event/EVENT/EventData/Image
              value: \\powershell.exe
    `),
  },
  {
    name: 'O365 Login From Poor Reputation IP',
    yaml: trim(`
      op: and
      rules:
        - op: is tagged
          tag: sanitized_o365
        - op: and
          rules:
            - case sensitive: false
              op: is
              path: event/Operation
              value: UserLoggedIn
            - op: or
              rules:
                - op: lookup
                  path: event/ClientIP
                  resource: lcr://lookup/sanitized-bad-ips
                - op: lookup
                  path: event/ClientIP
                  resource: lcr://lookup/sanitized-tor
                - metadata_rules:
                    case sensitive: false
                    op: contains
                    path: event/geoip/city_name
                    value: SanitizedCity
                  op: lookup
                  path: event/ClientIP
                  resource: lcr://api/sanitized-geo
    `),
  },
  {
    name: 'O365 Inbox Rule From Address Scope',
    yaml: trim(`
      op: and
      rules:
        - op: is tagged
          tag: sanitized_o365
        - op: and
          rules:
            - op: or
              rules:
                - case sensitive: false
                  op: is
                  path: event/Operation
                  value: New-InboxRule
                - case sensitive: false
                  op: is
                  path: event/Operation
                  value: Set-InboxRule
            - op: scope
              path: event/Parameters
              rule:
                op: and
                rules:
                  - op: is
                    path: event/Name
                    value: FromAddressContainsWords
                  - op: exists
                    path: event/Value
    `),
  },
  {
    name: 'Non-RFC1918 Windows Logon',
    yaml: trim(`
      event: WEL
      op: and
      rules:
        - case sensitive: false
          op: is
          path: event/EVENT/System/Channel
          value: Security
        - op: and
          rules:
            - case sensitive: false
              op: is
              path: event/EVENT/System/_event_id
              value: '4624'
            - op: is public address
              path: event/EVENT/EventData/IpAddress
            - cidr: 0.0.0.0/0
              op: cidr
              path: event/EVENT/EventData/IpAddress
        - not: true
          op: or
          rules:
            - op: or
              rules:
                - case sensitive: false
                  op: is
                  path: event/EVENT/EventData/IpAddress
                  value: 'null'
                - case sensitive: false
                  op: is
                  path: event/EVENT/EventData/TargetUserName
                  value: Anonymous Logon
            - op: or
              rules:
                - case sensitive: false
                  op: is
                  path: event/EVENT/EventData/IpAddress
                  value: 127.0.0.1
                - cidr: 169.254.0.0/16
                  op: cidr
                  path: event/EVENT/EventData/IpAddress
                - case sensitive: false
                  op: is
                  path: event/EVENT/EventData/IpAddress
                  value: 0.0.0.0
            - case sensitive: false
              op: ends with
              path: event/EVENT/EventData/ProcessName
              value: \\inetsrv\\w3wp.exe
    `),
  },
]
