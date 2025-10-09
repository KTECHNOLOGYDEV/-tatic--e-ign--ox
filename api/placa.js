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

  const clean = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const antiga = /^[A-Z]{3}[0-9]{4}$/;
  const mercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

  if (!antiga.test(clean) && !mercosul.test(clean)) {
    return res.status(400).json({ error: 'Formato de placa inválido' });
  }

  try {
    // ✅ CONSULTA DIRETA POR PLACA VIA BRASILAPI
    const url = `https://brasilapi.com.br/api/fipe/v1/${clean}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Placa não encontrada' });
      }
      return res.status(500).json({ error: 'Serviço temporariamente indisponível' });
    }

    const data = await response.json();

    if (!data || !data.valor) {
      return res.status(404).json({ error: 'Dados da placa incompletos' });
    }

    res.status(200).json({
      placa: clean,
      marca: data.marca || '—',
      modelo: data.modelo || '—',
      ano_modelo: data.ano_modelo || '—',
      combustivel: data.combustivel || '—',
      valor: data.valor || 'R$ —',
      codigo_fipe: data.fipe_codigo || '—',
      referencia: data.referencia || '—'
    });

  } catch (err) {
    console.error('[BRASILAPI ERROR]', err);
    res.status(500).json({ error: 'Erro interno ao consultar placa' });
  }
}
