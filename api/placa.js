// api/placa.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { placa } = req.query;
  if (!placa) {
    return res.status(400).json({ error: 'Parâmetro "placa" é obrigatório' });
  }

  // Limpa e valida a placa
  const clean = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const antiga = /^[A-Z]{3}[0-9]{4}$/;
  const mercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

  if (!antiga.test(clean) && !mercosul.test(clean)) {
    return res.status(400).json({ error: 'Formato de placa inválido' });
  }

  try {
    // ✅ CONSULTA À NOVA API SINESP
    const url = 'https://sinesp-v3.apibrasil.com.br/api';
    const chave = 'https://sinesp.contrateumdev.com.br'; // Chave pública indicada

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'chave': chave
      },
      body: JSON.stringify({ placa: clean })
    });

    if (!response.ok) {
      // Tenta ler o corpo do erro para uma mensagem mais específica
      let errorMessage = 'Serviço temporariamente indisponível';
      try {
        const errorText = await response.text();
        console.error("Erro da API Sinesp:", response.status, errorText);
        if (response.status === 429) {
          errorMessage = 'Limite de requisições atingido. Aguarde 60 segundos.';
        } else if (response.status === 400) {
          errorMessage = 'Requisição inválida. Verifique a placa.';
        }
      } catch (e) {
        // Ignora erro ao ler o corpo do erro
      }
      return res.status(response.status).json({ error: errorMessage });
    }

    const data = await response.json();

    // Verifica se a resposta indica erro
    if (data.codigoRetorno !== "0") {
        console.error("Erro lógico da API Sinesp:", data);
        let userMessage = 'Placa não encontrada ou dados indisponíveis.';
        // Mapeia códigos de erro comuns, se necessário
        // Exemplo: if (data.codigoRetorno === "1") userMessage = "...";
        return res.status(404).json({ error: userMessage });
    }


    // Extrai os dados FIPE com maior score (mais relevante)
    let melhorFipe = null;
    if (data.fipe && data.fipe.dados && Array.isArray(data.fipe.dados)) {
        // Filtra dados com score > 0 e ordena por score decrescente
        const dadosValidos = data.fipe.dados.filter(d => d.score > 0);
        if (dadosValidos.length > 0) {
            dadosValidos.sort((a, b) => b.score - a.score);
            melhorFipe = dadosValidos[0]; // Pega o primeiro (maior score)
        } else if (data.fipe.dados.length > 0) {
            // Se não tiver score, pega o primeiro
            melhorFipe = data.fipe.dados[0];
        }
    }

    // Monta a resposta final
    res.status(200).json({
      placa: clean,
      marca: data.marca || '—',
      modelo: data.modelo || '—',
      ano: data.ano || '—',
      ano_modelo: data.anoModelo || '—',
      cor: data.cor || '—',
      chassi: data.chassi || '—',
      municipio: data.municipio || '—',
      uf: data.uf || '—',
      situacao: data.situacao || '—',
      valor: melhorFipe ? melhorFipe.texto_valor : 'R$ —',
      codigo_fipe: melhorFipe ? melhorFipe.codigo_fipe : '—',
      combustivel: melhorFipe ? melhorFipe.combustivel : '—',
      referencia: melhorFipe ? melhorFipe.mes_referencia : '—'
    });

  } catch (err) {
    console.error('[SINESP API ERROR]', err);
    // Erro de rede ou JSON inválido
    res.status(500).json({ error: 'Erro interno ao consultar placa. Tente novamente mais tarde.' });
  }
}
