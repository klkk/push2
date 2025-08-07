/**
 * Cloudflare Pages Functions 中间件
 * 处理所有请求路由
 */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // 静态文件直接返回
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return context.next();
  }
  
  // API 路由处理
  if (url.pathname === '/api/submit') {
    return await handleManualSubmit(request, env);
  }
  
  if (url.pathname === '/api/status') {
    return await handleStatus(env);
  }
  
  if (url.pathname === '/api/upload') {
    return await handleUpload(request, env);
  }
  
  // 其他请求继续处理
  return context.next();
}

/**
 * 提交链接到百度
 */
async function submitLinksTobaidu(env) {
  try {
    // 获取待提交的链接
    const linksToSubmit = await getUnsubmittedLinks(env);
    
    if (linksToSubmit.length === 0) {
      console.log('没有待提交的链接');
      return { success: true, message: '没有待提交的链接' };
    }
    
    // 限制每次提交20条
    const batchLinks = linksToSubmit.slice(0, 20);
    console.log(`准备提交 ${batchLinks.length} 条链接`);
    
    // 提交到百度
    const result = await submitToBaidu(batchLinks, env);
    
    if (result.success) {
      // 标记已提交的链接
      await markLinksAsSubmitted(batchLinks, env);
      console.log(`成功提交 ${batchLinks.length} 条链接`);
      return { success: true, message: `成功提交 ${batchLinks.length} 条链接` };
    } else {
      console.error('提交失败:', result.error);
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.error('提交任务执行失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 获取未提交的链接
 */
async function getUnsubmittedLinks(env) {
  try {
    // 从KV存储获取链接列表
    const linksData = await env.SUBMITTED_LINKS.get('all_links');
    if (!linksData) {
      return [];
    }
    
    const allLinks = JSON.parse(linksData);
    return allLinks.filter(link => !link.submitted);
    
  } catch (error) {
    console.error('获取链接失败:', error);
    return [];
  }
}

/**
 * 提交链接到百度站长平台
 */
async function submitToBaidu(links, env) {
  try {
    const urls = links.map(link => link.url).join('\n');
    
    const response = await fetch(`http://data.zz.baidu.com/urls?site=${env.BAIDU_SITE}&token=${env.BAIDU_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'User-Agent': 'curl/7.12.1'
      },
      body: urls
    });
    
    const result = await response.text();
    console.log('百度API响应:', result);
    
    if (response.ok) {
      return { success: true, result };
    } else {
      return { success: false, error: result };
    }
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 标记链接为已提交
 */
async function markLinksAsSubmitted(submittedLinks, env) {
  try {
    const linksData = await env.SUBMITTED_LINKS.get('all_links');
    const allLinks = linksData ? JSON.parse(linksData) : [];
    
    // 更新提交状态
    const submittedUrls = submittedLinks.map(link => link.url);
    allLinks.forEach(link => {
      if (submittedUrls.includes(link.url)) {
        link.submitted = true;
        link.submittedAt = new Date().toISOString();
      }
    });
    
    await env.SUBMITTED_LINKS.put('all_links', JSON.stringify(allLinks));
    
  } catch (error) {
    console.error('标记链接失败:', error);
  }
}

/**
 * 手动提交处理
 */
async function handleManualSubmit(request, env) {
  try {
    const result = await submitLinksTobaidu(env);
    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * 状态查询处理
 */
async function handleStatus(env) {
  try {
    const linksData = await env.SUBMITTED_LINKS.get('all_links');
    const allLinks = linksData ? JSON.parse(linksData) : [];
    
    const submitted = allLinks.filter(link => link.submitted).length;
    const pending = allLinks.filter(link => !link.submitted).length;
    
    return new Response(JSON.stringify({
      total: allLinks.length,
      submitted,
      pending,
      lastUpdate: new Date().toISOString()
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * 上传链接文件处理
 */
async function handleUpload(request, env) {
  try {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new Response(JSON.stringify({ error: '请选择文件' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    const content = await file.text();
    const urls = content.split('\n')
      .map(url => url.trim())
      .filter(url => url && url.startsWith('http'));
    
    // 获取现有链接
    const existingData = await env.SUBMITTED_LINKS.get('all_links');
    const existingLinks = existingData ? JSON.parse(existingData) : [];
    const existingUrls = new Set(existingLinks.map(link => link.url));
    
    // 添加新链接
    const newLinks = urls
      .filter(url => !existingUrls.has(url))
      .map(url => ({
        url,
        submitted: false,
        addedAt: new Date().toISOString()
      }));
    
    const allLinks = [...existingLinks, ...newLinks];
    await env.SUBMITTED_LINKS.put('all_links', JSON.stringify(allLinks));
    
    return new Response(JSON.stringify({
      success: true,
      message: `成功添加 ${newLinks.length} 条新链接`,
      total: allLinks.length
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}