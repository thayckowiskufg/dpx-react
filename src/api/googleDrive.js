// Upload de anexos (exames e vídeos) direto para o Google Drive, pelo navegador
// de quem responde o formulário, usando Google Identity Services (OAuth).
//
// O arquivo é enviado para uma pasta fixa do Drive do professor (DRIVE_FOLDER_ID),
// compartilhada como "Qualquer pessoa com o link - Editor". O token de acesso só
// vive em memória (nunca é salvo em localStorage) e expira sozinho em ~1h.
const CLIENT_ID = '960348884176-9sjc6qs2bmr4j1puft2ii1mulkjg5hm2.apps.googleusercontent.com'
const DRIVE_FOLDER_ID = '1QBNVH6vzCiHA0sIov-M3t40eB0zEnFLX'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

let tokenClient = null
let cachedToken = null

function loadTokenClient() {
  if (tokenClient) return tokenClient
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services ainda não carregou. Aguarde um instante e tente novamente.')
  }
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: DRIVE_SCOPE,
    callback: () => {},
  })
  return tokenClient
}

// Precisa ser chamada a partir de um gesto direto do usuário (ex.: dentro do
// onChange de um <input type="file">, sem "await" antes dela), senão o
// navegador bloqueia o popup de login do Google.
function requestAccessToken() {
  return new Promise((resolve, reject) => {
    const client = loadTokenClient()
    client.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error))
        return
      }
      cachedToken = response.access_token
      resolve(cachedToken)
    }
    client.requestAccessToken({ prompt: cachedToken ? '' : 'consent' })
  })
}

async function getAccessToken() {
  if (cachedToken) return cachedToken
  return requestAccessToken()
}

async function uploadOne(file, accessToken) {
  const metadata = {
    name: file.name,
    parents: [DRIVE_FOLDER_ID],
  }

  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', file)

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  )

  if (response.status === 401) {
    // Token expirado: limpa o cache para forçar um novo login na próxima tentativa.
    cachedToken = null
    throw new Error('Sessão do Google expirou. Tente anexar o arquivo de novo.')
  }

  if (!response.ok) {
    throw new Error(`Falha ao enviar "${file.name}" para o Drive (status ${response.status}).`)
  }

  const data = await response.json()
  return { name: file.name, url: data.webViewLink }
}

// Envia um ou mais arquivos para a pasta do Drive e retorna [{ name, url }].
// Lança erro se o login for recusado ou algum upload falhar.
export async function uploadFilesToDrive(files) {
  const accessToken = await getAccessToken()
  const uploaded = []
  for (const file of files) {
    uploaded.push(await uploadOne(file, accessToken))
  }
  return uploaded
}
