// app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requireAuth, requireRole } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Get all non-system settings that user can access
    let whereClause = 'is_system = false'
    const queryParams: any[] = []
    
    // Only admins can see system settings
    if (user.role === 'admin') {
      whereClause = '1=1' // All settings
    }
    
    const settings = await Database.query(`
      SELECT setting_key, setting_value, setting_type, description
      FROM app_settings
      WHERE ${whereClause}
      ORDER BY setting_key
    `, queryParams)
    
    // Convert to key-value format
    const settingsObject = settings.reduce((acc, setting) => {
      let value = setting.setting_value
      
      // Parse JSON values
      if (setting.setting_type === 'json' && typeof value === 'string') {
        try {
          value = JSON.parse(value)
        } catch (e) {
          console.warn(`Failed to parse JSON setting: ${setting.setting_key}`)
        }
      }
      
      acc[setting.setting_key] = value
      return acc
    }, {} as Record<string, any>)
    
    // Get user preferences from profile
    const profile = await Database.findOne('profiles', { id: user.id })
    const userPreferences = profile?.settings || {}
    
    return NextResponse.json({
      settings: settingsObject,
      userPreferences,
      systemSettings: user.role === 'admin' ? settingsObject : undefined
    })
    
  } catch (error) {
    console.error('Get settings error:', error)
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { userPreferences, systemSettings } = body
    
    await Database.transaction(async (client) => {
      // Update user preferences
      if (userPreferences) {
        await client.query(`
          UPDATE profiles 
          SET settings = $1, updated_at = NOW()
          WHERE id = $2
        `, [JSON.stringify(userPreferences), user.id])
      }
      
      // Update system settings (admin only)
      if (systemSettings && user.role === 'admin') {
        for (const [key, value] of Object.entries(systemSettings)) {
          // Determine setting type
          let settingType = 'string'
          let settingValue = value
          
          if (typeof value === 'number') {
            settingType = 'number'
          } else if (typeof value === 'boolean') {
            settingType = 'boolean'
          } else if (typeof value === 'object') {
            settingType = 'json'
            settingValue = JSON.stringify(value)
          }
          
          // Upsert setting
          await client.query(`
            INSERT INTO app_settings (setting_key, setting_value, setting_type, updated_by)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (setting_key) DO UPDATE SET
              setting_value = EXCLUDED.setting_value,
              setting_type = EXCLUDED.setting_type,
              updated_by = EXCLUDED.updated_by,
              updated_at = NOW()
          `, [key, settingValue, settingType, user.id])
        }
      }
    })
    
    return NextResponse.json({
      message: 'Settings updated successfully'
    })
    
  } catch (error) {
    console.error('Update settings error:', error)
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/settings/system/route.ts
export async function GET_SYSTEM(request: NextRequest) {
  try {
    await requireRole(request, ['admin'])
    
    const systemSettings = await Database.query(`
      SELECT setting_key, setting_value, setting_type, description, is_system
      FROM app_settings
      ORDER BY is_system DESC, setting_key ASC
    `)
    
    const settings = systemSettings.reduce((acc, setting) => {
      let value = setting.setting_value
      
      // Parse JSON values
      if (setting.setting_type === 'json' && typeof value === 'string') {
        try {
          value = JSON.parse(value)
        } catch (e) {
          console.warn(`Failed to parse JSON setting: ${setting.setting_key}`)
        }
      }
      
      acc[setting.setting_key] = {
        value,
        type: setting.setting_type,
        description: setting.description,
        isSystem: setting.is_system
      }
      return acc
    }, {} as Record<string, any>)
    
    return NextResponse.json({ settings })
    
  } catch (error) {
    console.error('Get system settings error:', error)
    
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT_SYSTEM(request: NextRequest) {
  try {
    const user = await requireRole(request, ['admin'])
    const body = await request.json()
    
    const { settings } = body
    
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid settings data' },
        { status: 400 }
      )
    }
    
    await Database.transaction(async (client) => {
      for (const [key, config] of Object.entries(settings) as [string, any][]) {
        const { value, type = 'string', description } = config
        
        let settingValue = value
        if (type === 'json' && typeof value === 'object') {
          settingValue = JSON.stringify(value)
        }
        
        await client.query(`
          INSERT INTO app_settings (setting_key, setting_value, setting_type, description, updated_by)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (setting_key) DO UPDATE SET
            setting_value = EXCLUDED.setting_value,
            setting_type = EXCLUDED.setting_type,
            description = EXCLUDED.description,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
        `, [key, settingValue, type, description, user.id])
      }
    })
    
    return NextResponse.json({
      message: 'System settings updated successfully'
    })
    
  } catch (error) {
    console.error('Update system settings error:', error)
    
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}