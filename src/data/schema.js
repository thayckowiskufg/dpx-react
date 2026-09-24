// Schema do Questionário DPX (Discinesia Paroxística Canina).
//
// Estrutura oficial definida pelo professor, em 4 seções:
// - Seção 1: Dados (identificação do tutor/paciente)
// - Seção 2: Dados sobre DPX
// - Seção 3: Tratamento
// - Seção 4: Comentários e anexos
//
// Cada campo tem um "id" curto em snake_case (chave do objeto de respostas),
// um "label" (texto exibido) e um "type":
//   text        -> texto livre curto
//   textarea    -> texto livre longo (multilinha)
//   email       -> texto livre com validação de formato de e-mail
//   number      -> numérico, aceita só dígitos e vírgula/ponto decimal
//   date        -> data (input nativo type="date", valor ISO AAAA-MM-DD)
//   radio       -> escolha única, poucas opções, exibidas como botões
//   multiselect -> escolha única, várias opções, exibida como chips clicáveis
//                  (apesar do nome, só permite selecionar 1 alternativa por vez)
//   file        -> upload de arquivo(s), enviados direto ao Google Drive
//   country     -> select de país (base de dados da lib country-state-city)
//   state       -> select de estado, filtrado pelo país escolhido em "dependsOn"
//   city        -> select de cidade, filtrado pelo estado escolhido em "dependsOn"
//
// Um campo pode ter "condition": { field, equals } ou { field, in: [...] }
// indicando que só deve aparecer (e ser exigido) quando outro campo já
// respondido tiver aquele valor. Quando a condição deixa de ser satisfeita,
// o valor do campo é limpo automaticamente para evitar dado órfão.
//
// Um campo pode ter "dependsOn": "outro_campo_id" indicando que suas opções
// dependem do valor de outro campo (ex.: estado depende do país escolhido).
// Quando o campo do qual se depende muda, o valor é limpo em cadeia.
//
// Um campo "number" pode ter "unit" (texto exibido ao lado do input, ex.:
// "anos"), "min"/"max" (limites fixos) e "minField"/"maxField" (limites
// dinâmicos, comparando com o valor de outro campo — ex.: a idade no primeiro
// episódio não pode ser maior que a idade atual do paciente).

export const SIM_NAO = ['Sim', 'Não']

export const sections = [
  {
    id: 'dados',
    title: 'Dados',
    fields: [
      { id: 'veterinario_responsavel', label: 'Médico veterinário responsável', type: 'text', required: true },
      { id: 'tutor_responsavel', label: 'Responsável pelo pet / tutor', type: 'text', required: true },
      { id: 'email', label: 'E-mail', type: 'email', required: true },
      { id: 'pais', label: 'País', type: 'country', required: true },
      { id: 'estado', label: 'Estado', type: 'state', dependsOn: 'pais', required: true },
      { id: 'cidade', label: 'Cidade', type: 'city', dependsOn: 'estado', required: true },
      { id: 'nome_paciente', label: 'Nome do paciente', type: 'text', required: true },
      { id: 'raca_paciente', label: 'Raça do paciente', type: 'text', required: true },
      {
        id: 'sexo',
        label: 'Sexo',
        type: 'radio',
        options: ['Macho castrado', 'Macho inteiro', 'Fêmea castrada', 'Fêmea inteira'],
        required: true,
      },
      {
        id: 'idade_castracao',
        label: 'Idade em que foi castrado',
        type: 'number',
        unit: 'anos',
        min: 0,
        maxField: 'idade_atual',
        condition: { field: 'sexo', in: ['Macho castrado', 'Fêmea castrada'] },
        required: true,
      },
      { id: 'idade_atual', label: 'Idade atual do paciente', type: 'number', unit: 'anos', min: 0, max: 30, required: true },
    ],
  },
  {
    id: 'dpx',
    title: 'Dados sobre DPX',
    fields: [
      {
        id: 'idade_primeiro_episodio',
        label: 'Idade no primeiro episódio',
        type: 'number',
        unit: 'anos',
        min: 0,
        maxField: 'idade_atual',
        required: true,
      },
      {
        id: 'duracao_media',
        label: 'Duração média dos episódios',
        type: 'radio',
        options: ['30 segundos', '1 minuto', '2 minutos', '5 minutos', '10 minutos'],
        required: true,
      },
      {
        id: 'frequencia_media',
        label: 'Frequência média dos episódios',
        type: 'radio',
        options: ['Diária', 'Semanal', 'Mensal', 'Semestral', 'Anual'],
        required: true,
      },
      {
        id: 'crises_mesmo_dia',
        label: 'Já teve mais de uma crise no mesmo dia?',
        type: 'radio',
        options: ['Não', 'Sim, duas vezes', 'Sim, três a cinco vezes', 'Sim, seis a dez vezes', 'Sim, mais de dez vezes'],
        required: true,
      },
      {
        id: 'periodo_ocorrencia',
        label: 'Período de ocorrência dos episódios',
        type: 'radio',
        options: ['Manhã', 'Tarde', 'Noite', 'Aleatório'],
        required: true,
      },
      {
        id: 'fatores_desencadeantes',
        label: 'Fatores desencadeantes do episódio',
        type: 'multiselect',
        options: [
          'Extremos climáticos',
          'Mudança de posição (levantar, deitar)',
          'Estresse',
          'Excitação',
          'Exercício',
          'Ruídos altos',
          'Luzes intensas',
        ],
      },
      {
        id: 'frequencia_fatores_precedem',
        label: 'Com que frequência essas situações precedem os episódios',
        type: 'radio',
        options: [
          'Em todos os episódios',
          'Em alguns, mais da metade',
          'Menos da metade da quantidade de episódios',
          'Ocorreu uma única vez',
        ],
        required: true,
      },
      {
        id: 'dieta_inicio_episodios',
        label: 'Dieta do animal quando os episódios começaram',
        type: 'radio',
        options: ['Dieta sem grãos', 'Dieta com glúten'],
        required: true,
      },
      {
        id: 'episodios_compativeis_epilepsia',
        label: 'O animal já apresentou episódios diagnosticados ou compatíveis com crise epiléptica?',
        type: 'radio',
        options: SIM_NAO,
        required: true,
      },
      {
        id: 'sinais_precedem_episodio',
        label: 'Sinais clínicos que precedem os episódios',
        type: 'multiselect',
        options: [
          'Inquietação',
          'Isolamento',
          'Marcha rígida',
          'Fasciculações musculares',
          'Quedas',
          'Sinais autonômicos',
          'Medo',
          'Ataxia',
          'Náusea',
          'Espasmos',
          'Congelamento',
          'Desatenção',
          'Olhar fixo',
          'Respiração ofegante',
          'Contrações musculares faciais',
          'Desorientação',
          'Ansiedade',
          'Andar de um lado para o outro',
          'Letargia',
          'Enrijecimento de membros',
          'Ruídos intestinais intensos',
          'Marcha hipermétrica',
          'Salivação',
          'Vômito',
          'Nenhum',
        ],
      },
      {
        id: 'frequencia_sinais_precedem',
        label: 'Com que frequência essas atitudes precedem os episódios',
        type: 'radio',
        options: ['Sempre', 'Frequentemente, mas não sempre', 'Poucas vezes'],
        required: true,
      },
      {
        id: 'sinais_durante_episodio',
        label: 'Sinais clínicos durante o episódio',
        type: 'multiselect',
        options: [
          'Flexão lateral de pescoço e coluna',
          'Postura anormal de cabeça e pescoço',
          'Consciência preservada',
          'Comprometimento da consciência',
          'Hipertonia sustentada',
          'Aumento do tônus muscular',
          'Diminuição do tônus muscular',
          'Normalidade do tônus muscular',
          'Distonia de membros/cabeça/pescoço',
          'Perda de controle dos membros',
          'Movimentos contorcidos',
          'Movimentos hipercinéticos',
          'Movimentos repetitivos/involuntários/abruptos',
          'Movimentos tônico-clônicos',
          'Contrações musculares',
          'Tremores',
          'Ataxia',
          'Marcha hipermétrica',
          'Dificuldade de andar',
          'Incapacidade de permanecer em pé',
          'Titubação',
          'Dorso arqueado',
          'Aceno com a cabeça',
          'Cabeça mantida abaixada',
          'Virar a cabeça',
          'Esfregar a pata na cabeça',
          'Lamber os lábios',
          'Sinais de angústia',
          'Respiração ofegante',
          'Ruídos intestinais intensos',
          'Micção',
          'Defecação',
          'Sialorreia',
          'Olhos lacrimejantes',
        ],
      },
      {
        id: 'estado_mental_durante',
        label: 'Estado mental do paciente durante os episódios',
        type: 'radio',
        options: ['Estado normal', 'Estado alterado', 'Perda'],
        required: true,
      },
      {
        id: 'historico_familiar_dpx',
        label: 'Apresenta histórico familiar de Discinesia Paroxística na família',
        type: 'radio',
        options: ['Sim', 'Não', 'Não sabe informar'],
        required: true,
      },
      {
        id: 'sinais_apos_episodio',
        label: 'Sinais após o episódio',
        type: 'multiselect',
        options: [
          'Normal',
          'Letargia',
          'Comportamento afetuoso',
          'Confusão/desorientação',
          'Isolamento',
          'Inquietação',
          'Medo',
          'Ansiedade',
          'Náusea',
          'Sede',
          'Sonolência/cansaço',
          'Alteração de comportamento',
          'Retorno imediato ao comportamento normal',
          'Ataxia',
          'Dificuldade para caminhar',
          'Olhar fixo',
          'Deambulação',
          'Choramingando',
          'Salivação',
          'Vômito',
          'Micção',
          'Defecação',
        ],
      },
      {
        id: 'tempo_retorno_normal',
        label: 'Em caso de alterações após o episódio, quanto tempo o animal leva para retornar completamente ao comportamento habitual?',
        type: 'text',
      },
      { id: 'data_ultimo_episodio', label: 'Data do último episódio', type: 'date', required: true },
      {
        id: 'reacoes_posturais',
        label: 'Reações posturais durante a avaliação neurológica',
        type: 'multiselect',
        options: [
          'Não avaliadas',
          'Normais em todos os membros',
          'Membro pélvico direito alterado',
          'Membro pélvico esquerdo alterado',
          'Membro torácico direito alterado',
          'Membro torácico esquerdo alterado',
        ],
      },
      {
        id: 'exames_realizados',
        label: 'Exames realizados',
        type: 'multiselect',
        options: ['Hemograma', 'Bioquímico', 'Radiografia do encéfalo', 'Tomografia da cabeça', 'Ressonância magnética do encéfalo', 'EEG', 'LCR'],
      },
      {
        id: 'anexo_exames',
        label: 'Anexar arquivos dos resultados dos exames',
        type: 'file',
        multiple: true,
        accept: ['application/pdf', 'image/jpeg', 'image/png'],
        acceptAttr: '.pdf,.jpg,.jpeg,.png',
        acceptLabel: 'PDF, JPG ou PNG',
      },
    ],
  },
  {
    id: 'tratamento',
    title: 'Tratamento',
    fields: [
      {
        id: 'usou_medicamento_antiepileptico',
        label: 'Foram usados medicamentos anti-epilépticos?',
        type: 'radio',
        options: SIM_NAO,
        required: true,
      },
      {
        id: 'descricao_medicamento',
        label: 'Descreva o medicamento usado, dose e duração',
        type: 'textarea',
        condition: { field: 'usou_medicamento_antiepileptico', equals: 'Sim' },
        required: true,
      },
      {
        id: 'alteracao_dieta_apos_episodios',
        label: 'Houve alteração na dieta do animal após o início dos episódios?',
        type: 'radio',
        options: SIM_NAO,
        required: true,
      },
      {
        id: 'efeito_tratamento',
        label: 'Qual efeito do tratamento na condição médica?',
        type: 'radio',
        options: ['Melhora', 'Piora', 'Sem mudança'],
        required: true,
      },
      {
        id: 'alteracao_apos_tratamento',
        label: 'Em caso de mudança após o tratamento proposto, qual a alteração analisada?',
        type: 'multiselect',
        options: [
          'Redução na frequência',
          'Aumento da frequência',
          'Redução da duração',
          'Aumento da duração',
          'Sinais mais brandos',
          'Sinais potencializados',
        ],
      },
    ],
  },
  {
    id: 'comentarios',
    title: 'Comentários e anexos',
    fields: [
      {
        id: 'comentarios_adicionais',
        label: 'Comentários adicionais e descrição de pontos relevantes',
        type: 'textarea',
      },
      {
        id: 'anexo_videos',
        label: 'Anexar vídeos dos episódios',
        type: 'file',
        multiple: true,
        accept: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
        acceptAttr: '.mp4,.mov,.avi,.webm',
        acceptLabel: 'MP4, MOV, AVI ou WEBM',
        maxSizeMB: 100,
      },
    ],
  },
]
