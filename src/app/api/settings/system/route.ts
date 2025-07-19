// app/api/settings/system/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requireRole } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
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

export async function PUT(request: NextRequest) {
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

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['admin'])
    const body = await request.json()
    
    const { setting_key, setting_value, setting_type = 'string', description, is_system = false } = body
    
    if (!setting_key) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      )
    }
    
    // Check if setting already exists
    const existing = await Database.findOne('app_settings', { setting_key })
    if (existing) {
      return NextResponse.json(
        { error: 'Setting already exists' },
        { status: 409 }
      )
    }
    
    let processedValue = setting_value
    if (setting_type === 'json' && typeof setting_value === 'object') {
      processedValue = JSON.stringify(setting_value)
    }
    
    const newSetting = await Database.insert('app_settings', {
      setting_key,
      setting_value: processedValue,
      setting_type,
      description,
      is_system,
      updated_by: user.id
    })
    
    return NextResponse.json({
      setting: newSetting,
      message: 'Setting created successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Create system setting error:', error)
    
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

export async function DELETE(request: NextRequest) {
  try {
    await requireRole(request, ['admin'])
    
    const { searchParams } = new URL(request.url)
    const settingKey = searchParams.get('key')
    
    if (!settingKey) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      )
    }
    
    // Check if setting exists and is not system setting
    const existing = await Database.findOne('app_settings', { setting_key: settingKey })
    if (!existing) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      )
    }
    
    if (existing.is_system) {
      return NextResponse.json(
        { error: 'Cannot delete system setting' },
        { status: 400 }
      )
    }
    
    await Database.delete('app_settings', { setting_key: settingKey })
    
    return NextResponse.json({
      message: 'Setting deleted successfully'
    })
    
  } catch (error) {
    console.error('Delete system setting error:', error)
    
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