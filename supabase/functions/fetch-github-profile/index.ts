import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username } = await req.json();
    if (!username) {
      return new Response(JSON.stringify({ error: 'GitHub username required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user profile
    const profileRes = await fetch(`https://api.github.com/users/${username}`, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Lovable-Portfolio' },
    });

    if (!profileRes.ok) {
      return new Response(JSON.stringify({ error: `GitHub user not found: ${username}` }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const profile = await profileRes.json();

    // Fetch public repos
    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=30&type=owner`, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Lovable-Portfolio' },
    });
    const repos = reposRes.ok ? await reposRes.json() : [];

    // Calculate language stats
    const languageMap: Record<string, number> = {};
    for (const repo of repos) {
      if (repo.language) {
        languageMap[repo.language] = (languageMap[repo.language] || 0) + 1;
      }
    }

    const githubData = {
      avatar_url: profile.avatar_url,
      html_url: profile.html_url,
      public_repos: profile.public_repos,
      followers: profile.followers,
      following: profile.following,
      bio: profile.bio,
      company: profile.company,
      location: profile.location,
      languages: languageMap,
      repos: repos.map((r: any) => ({
        name: r.name,
        full_name: r.full_name,
        html_url: r.html_url,
        description: r.description,
        language: r.language,
        stargazers_count: r.stargazers_count,
        forks_count: r.forks_count,
        updated_at: r.updated_at,
        topics: r.topics || [],
      })),
      fetched_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(githubData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching GitHub profile:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
