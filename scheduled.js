/**
 * 定时任务处理函数
 * 由于 Cloudflare Pages 不支持 cron triggers，
 * 可以通过外部服务（如 GitHub Actions）定期调用此接口
 */

export async function onRequestPost(context) {
  const { env } = context;
  
  try {
    console.log('开始执行定时任务...');
    const result = await submitLinksTobaidu(env);
    
    return new Response(JSON.stringify({
      success: true,
      message: '定时任务执行完成',
      result
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('定时任务执行失败:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
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