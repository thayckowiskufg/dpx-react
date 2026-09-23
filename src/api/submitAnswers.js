// Ponto único de envio das respostas do questionário.
//
// As respostas são enviadas para um Google Apps Script publicado como Web
// App, que grava uma nova linha na planilha do Google Sheets. Os campos de
// upload (exames e vídeos) já chegam aqui como { name, url } — o arquivo em
// si foi enviado direto ao Google Drive pelo navegador (ver api/googleDrive.js)
// no momento em que foi selecionado, então aqui só serializamos o link.
//
// O fetch usa Content-Type "text/plain" (em vez de "application/json") de
// propósito: assim o navegador não dispara um preflight OPTIONS, que o
// Apps Script Web App não sabe responder. O Apps Script recebe o texto e
// faz JSON.parse normalmente.
const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyZCxtBFqk9Vy_kheU70Ubx5AFoWJTdJnF0gy3xifteOXUBPVqEzb482nWpzcsqwqr8NA/exec'

function serializeAnswers(answers) {
  const result = {}
  Object.entries(answers).forEach(([key, value]) => {
    if (Array.isArray(value) && value[0]?.url) {
      result[key] = value.map((file) => `${file.name}: ${file.url}`)
    } else {
      result[key] = value
    }
  })
  return result
}

export async function submitAnswers(answers) {
  const submission = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    respostas: serializeAnswers(answers),
  }

  try {
    await fetch(SHEET_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(submission),
    })
  } catch (error) {
    // O Apps Script normalmente não envia cabeçalhos CORS na resposta, então
    // o navegador pode bloquear a leitura dela e o fetch rejeita mesmo
    // quando a linha já foi gravada com sucesso na planilha. Por isso o
    // erro é apenas registrado, sem interromper o fluxo do formulário.
    console.warn('Falha ao ler resposta do Apps Script (pode já ter sido gravado):', error)
  }

  return submission
}
