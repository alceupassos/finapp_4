iFinance DB

SUPABASE
PROJECT NAME Cadastro_Cliente
PASSWORD Tg$9r@!Qf3LzP1#uBvX8
ID xzrmzmcoslomtzkzgskn
PROJECT URL https://xzrmzmcoslomtzkzgskn.supabase.co
Anon public eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI
Service_role eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc1MjYyMywiZXhwIjoyMDc3MzILegacy JWT secret 4NjIzfQ.716RfI9V2Vv3nGcx5rK4epnLddUUdFT3-doegfrXcmk
VaTqDBIXb36NV1ktPWpLfh+vca2fN4Lf+qylEDNn3Dga26Q5LgDarHjRBiajuqTJjpPhKnCPKkZJYlLD2MQFpQ==

(((CONNECTION STRING)))
IRI 
Direct Connection postgresql://postgres:[YOUR_PASSWORD]@db.lkilfmccvxfxppthakqa.supabase.co:5432/postgres
host: 
db.lkilfmccvxfxppthakqa.supabase.co

port: 
5432

database: 
postgres

user: 
postgres





Shared Pooler postgresql://postgres.xzrmzmcoslomtzkzgskn:[YOUR-PASSWORD]@aws-1-sa-east-1.pooler.supabase.com:5432/postgres

(((MOBILE FRAMEWORK)))
# env.local  
EXPO_PUBLIC_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<prefer publishable key instead of anon key for mobile and desktop apps>
        
# utils/supabase.ts
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, processLock } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  })
        


# App.tsx
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, processLock } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  })
        
(((ORM)))
#Tool PRISMA
 ## env.local
 # Connect to Supabase via connection pooling.
DATABASE_URL="postgres://postgres:[YOUR-PASSWORD]@db.xzrmzmcoslomtzkzgskn.supabase.co:6543/postgres?pgbouncer=true"

# Direct connection to the database. Used for migrations.
DIRECT_URL="postgres://postgres:[YOUR-PASSWORD]@db.xzrmzmcoslomtzkzgskn.supabase.co:5432/postgres”

##prisma/schema.prisma
 generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}



(((APP FRAMEWORK)))
# env.local (PAGES ROUTER)
NEXT_PUBLIC_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI

# utils/supabase.ts (PAGES ROUTER)

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
        
#_app.tsx (PAGES ROUTER)
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
        

MCP SERVER SUPABASE
Server URL https://mcp.supabase.com/mcp?project_ref=xzrmzmcoslomtzkzgskn


# env.local (APP ROUTER)
NEXT_PUBLIC_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI

# page.tsx (APP ROUTER)

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from('todos').select()

  return (
    <ul>
      {todos?.map((todo) => (
        <li>{todo}</li>
      ))}
    </ul>
  )
}


# utils/supabase/server.ts (APP ROUTER)

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};


# utils/supabase/client.ts (APP ROUTER)
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () =>
  createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
  );


# utils/supabase/middleware.ts (APP ROUTER)
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = (request: NextRequest) => {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  );

  return supabaseResponse
};





(((MCP)))
MCP SERVER URL=https://mcp.supabase.com/mcp?project_ref=xzrmzmcoslomtzkzgskn

#mcp server supabase VSCODE
add this configuration to .vscode/mcp.json:
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=xzrmzmcoslomtzkzgskn"
    }
  }
}

#mcp server supabase windsurf

Add this configuration to ~/.codeium/windsurf/mcp_config.json:
1{
2  "mcpServers": {
3    "supabase": {
4      "command": "npx",
5      "args": [
6        "-y",
7        "mcp-remote",
8        "https://mcp.supabase.com/mcp?project_ref=xzrmzmcoslomtzkzgskn"
9      ]
10    }
11  }
12}

Windsurf does not currently support remote MCP servers over HTTP transport. You need to use the mcp-remote package as a proxy.


NEXT JS 
adicione esse arquivo ao projeto db.js
insira esse conteudo emtre XX no inicio e fim do arquivo sem incluir o XX nesse arquivo 
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL
const sql = postgres(connectionString)
 
export default sql


SUPABASE
PROJECT f360 (sistema_fin)
PASSWORD B5b0dcf500@#
ID xzrmzmcoslomtzkzgskn
PROJECT URL https://xzrmzmcoslomtzkzgskn.supabase.co
Anon public eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI
Service_role eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc1MjYyMywiZXhwIjoyMDc3MzILegacy JWT secret 4NjIzfQ.716RfI9V2Vv3nGcx5rK4epnLddUUdFT3-doegfrXcmk
VaTqDBIXb36NV1ktPWpLfh+vca2fN4Lf+qylEDNn3Dga26Q5LgDarHjRBiajuqTJjpPhKnCPKkZJYlLD2MQFpQ==
Direct Connection postgresql://postgres:[YOUR_PASSWORD]@db.xzrmzmcoslomtzkzgskn.supabase.co:5432/postgres
Shared Pooler postgresql://postgres.xzrmzmcoslomtzkzgskn:[YOUR-PASSWORD]@aws-1-sa-east-1.pooler.supabase.com:5432/postgres

(((MOBILE FRAMEWORK)))
# env.local  
EXPO_PUBLIC_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<prefer publishable key instead of anon key for mobile and desktop apps>
        
# utils/supabase.ts
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, processLock } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  })
        


# App.tsx
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, processLock } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  })
        
(((ORM)))
#Tool PRISMA
 ## env.local
 # Connect to Supabase via connection pooling.
DATABASE_URL="postgres://postgres:[YOUR-PASSWORD]@db.xzrmzmcoslomtzkzgskn.supabase.co:6543/postgres?pgbouncer=true"

# Direct connection to the database. Used for migrations.
DIRECT_URL="postgres://postgres:[YOUR-PASSWORD]@db.xzrmzmcoslomtzkzgskn.supabase.co:5432/postgres”

##prisma/schema.prisma
 generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}



(((APP FRAMEWORK)))
# env.local (PAGES ROUTER)
NEXT_PUBLIC_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI

# utils/supabase.ts (PAGES ROUTER)

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
        
#_app.tsx (PAGES ROUTER)
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
        

MCP SERVER SUPABASE
Server URL https://mcp.supabase.com/mcp?project_ref=xzrmzmcoslomtzkzgskn


# env.local (APP ROUTER)
NEXT_PUBLIC_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI

# page.tsx (APP ROUTER)

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from('todos').select()

  return (
    <ul>
      {todos?.map((todo) => (
        <li>{todo}</li>
      ))}
    </ul>
  )
}


# utils/supabase/server.ts (APP ROUTER)

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};


# utils/supabase/client.ts (APP ROUTER)
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () =>
  createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
  );


# utils/supabase/middleware.ts (APP ROUTER)
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = (request: NextRequest) => {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  );

  return supabaseResponse
};





(((MCP)))
MCP SERVER URL=https://mcp.supabase.com/mcp?project_ref=xzrmzmcoslomtzkzgskn

#mcp server supabase VSCODE
add this configuration to .vscode/mcp.json:
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=xzrmzmcoslomtzkzgskn"
    }
  }
}

#mcp server supabase windsurf

Add this configuration to ~/.codeium/windsurf/mcp_config.json:
1{
2  "mcpServers": {
3    "supabase": {
4      "command": "npx",
5      "args": [
6        "-y",
7        "mcp-remote",
8        "https://mcp.supabase.com/mcp?project_ref=xzrmzmcoslomtzkzgskn"
9      ]
10    }
11  }
12}

Windsurf does not currently support remote MCP servers over HTTP transport. You need to use the mcp-remote package as a proxy.


NEXT JS 
adicione esse arquivo ao projeto db.js
insira esse conteudo emtre XX no inicio e fim do arquivo sem incluir o XX nesse arquivo 
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL
const sql = postgres(connectionString)

export default sql