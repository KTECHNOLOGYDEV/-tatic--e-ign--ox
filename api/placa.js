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

  // === TENTA BRASILAPI PRIMEIRO ===
  try {
    const brasilApiUrl = `https://brasilapi.com.br/api/fipe/v1/${clean}`;
    const response = await fetch(brasilApiUrl);

    if (response.ok) {
      const data = await response.json();
      if (data && data.valor) {
        return res.status(200).json({
          placa: clean,
          marca: data.marca || '—',
          modelo: data.modelo || '—',
          ano_modelo: data.ano_modelo || '—',
          combustivel: data.combustivel || '—',
          valor: data.valor || 'R$ —',
          codigo_fipe: data.fipe_codigo || '—',
          referencia: data.referencia || '—'
        });
      }
    }
  } catch (err) {
    console.warn('[BRASILAPI FAILED]', err.message);
  }

  // === TENTA FIPE.ONLINE COMO FALLBACK ===
  try {
    // ⚠️ Substitua 'SEU_TOKEN_AQUI' pelo seu token real da fipe.online
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4NjRmNTkwOC0xMDc1LTQ3ODItYjg5NC1iMjU0YmNlMGIzMWUiLCJlbWFpbCI6ImNvbWVyY2lhbGt0ZWNobm9sb2d5LmRldkBnbWFpbC5jb20iLCJpYXQiOjE3NTk5NzIxMDl9.97CV6a3tbOlCYRK03paR0ZKNneJjvZ6G-BJWXKZPCfE'; // <- COLOQUE SEU TOKEN AQUI
    const fipeOnlineUrl = `https://fipe.online/api/fipe/vehicle?plate=${clean}`;

    const response = await fetch(fipeOnlineUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'ConsultorFipe-VSLocar/1.0'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.price) {
        return res.status(200).json({
          placa: clean,
          marca: data.brand || '—',
          modelo: data.model || '—',
          ano_modelo: data.modelYear || '—',
          combustivel: data.fuel || '—',
          valor: data.price || 'R$ —',
          codigo_fipe: data.codeFipe || '—',
          referencia: data.referenceMonth || '—'
        });
      }
    }
  } catch (err) {
    console.warn('[FIPE.ONLINE FAILED]', err.message);
  }

  // === NENHUMA FUNCIONOU ===
  return res.status(404).json({ error: 'Placa não encontrada nas bases oficiais' });
}
