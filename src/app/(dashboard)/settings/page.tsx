// src/app/(dashboard)/settings/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/ui/useAuth'
import { PageTitle } from '@/components/common/PageTitle'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { 
  Users, 
  CreditCard, 
  Settings as SettingsIcon, 
  Database,
  Shield,
  Bell,
  Palette,
  FileText,
  Download,
  ChevronRight,
  User,
  Lock,
  Globe
} from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const { user, isAdmin, canManageUsers } = useAuth()

  const settingsSections = [
    // User Settings (Available to all users)
    {
      title: 'User Settings',
      description: 'Manage your personal account settings',
      items: [
        {
          icon: User,
          title: 'Profile',
          description: 'Update your personal information and preferences',
          href: '/settings/profile',
          badge: null,
          available: true
        },
        {
          icon: Lock,
          title: 'Security',
          description: 'Change password and security settings',
          href: '/settings/security',
          badge: null,
          available: true
        },
        {
          icon: Bell,
          title: 'Notifications',
          description: 'Configure notification preferences',
          href: '/settings/notifications',
          badge: 'Coming Soon',
          available: false
        },
        {
          icon: Palette,
          title: 'Appearance',
          description: 'Customize theme and display preferences',
          href: '/settings/appearance',
          badge: 'Coming Soon',
          available: false
        }
      ]
    },

    // System Settings (Admin only)
    {
      title: 'System Administration',
      description: 'System-wide configuration and management',
      adminOnly: true,
      items: [
        {
          icon: Users,
          title: 'User Management',
          description: 'Manage user accounts, roles, and permissions',
          href: '/settings/users',
          badge: null,
          available: canManageUsers
        },
        {
          icon: CreditCard,
          title: 'Bank Accounts',
          description: 'Configure bank accounts for invoice payments',
          href: '/settings/banks',
          badge: null,
          available: isAdmin
        },
        {
          icon: SettingsIcon,
          title: 'System Settings',
          description: 'Company information, VAT rates, and system preferences',
          href: '/settings/system',
          badge: null,
          available: isAdmin
        }
      ]
    },

    // Data Management
    {
      title: 'Data & Reports',
      description: 'Import, export, and backup your data',
      items: [
        {
          icon: Database,
          title: 'Data Import/Export',
          description: 'Import data from Excel/CSV or export current data',
          href: '/settings/data',
          badge: 'Coming Soon',
          available: false
        },
        {
          icon: FileText,
          title: 'Report Templates',
          description: 'Customize invoice and report templates',
          href: '/settings/templates',
          badge: 'Coming Soon',
          available: false
        },
        {
          icon: Download,
          title: 'Backup & Restore',
          description: 'Create backups and restore your data',
          href: '/settings/backup',
          badge: 'Coming Soon',
          available: false
        }
      ]
    },

    // Advanced Settings
    {
      title: 'Advanced',
      description: 'Advanced configuration and troubleshooting',
      adminOnly: true,
      items: [
        {
          icon: Shield,
          title: 'Security & Audit',
          description: 'View security logs and audit trails',
          href: '/settings/security-audit',
          badge: 'Coming Soon',
          available: false
        },
        {
          icon: Globe,
          title: 'API & Integrations',
          description: 'Manage API keys and third-party integrations',
          href: '/settings/integrations',
          badge: 'Coming Soon',
          available: false
        }
      ]
    }
  ]

  // Filter sections based on user permissions
  const availableSections = settingsSections.filter(section => {
    if (section.adminOnly && !isAdmin) return false
    return section.items.some(item => item.available)
  })

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <PageTitle 
            title="Settings" 
            subtitle="Manage your account and system preferences"
          />
          
          {/* User Info */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-sm">{user?.full_name}</div>
              <div className="text-xs text-gray-600 capitalize">{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Role</p>
                <p className="font-semibold capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Security</p>
                <p className="font-semibold">Secure</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Notifications</p>
                <p className="font-semibold">Enabled</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Palette className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Theme</p>
                <p className="font-semibold">Light</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Settings Sections */}
        {availableSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {/* Section Header */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
              <p className="text-sm text-gray-600">{section.description}</p>
            </div>

            {/* Settings Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.items
                .filter(item => item.available)
                .map((item, itemIndex) => (
                <Card 
                  key={itemIndex} 
                  className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => item.href && router.push(item.href)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <item.icon className="w-6 h-6 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">{item.title}</h3>
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                    {item.href && (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Admin Only Notice */}
            {section.adminOnly && !isAdmin && (
              <div className="text-center py-8 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Administrator access required for these settings</p>
              </div>
            )}
          </div>
        ))}

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/settings/profile')}
              className="justify-start"
            >
              <User className="w-4 h-4 mr-2" />
              Update Profile
            </Button>
            
            <Button
              variant="outline"
              onClick={() => router.push('/settings/security')}
              className="justify-start"
            >
              <Lock className="w-4 h-4 mr-2" />
              Change Password
            </Button>

            <RoleGuard allowedRoles={['admin']}>
              <Button
                variant="outline"
                onClick={() => router.push('/settings/banks')}
                className="justify-start"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Manage Banks
              </Button>
            </RoleGuard>
          </div>
        </Card>

        {/* Help & Support */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h2>
          <p className="text-blue-800 text-sm mb-4">
            If you need assistance with any settings or encounter issues, please contact your system administrator.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
              View Documentation
            </Button>
            <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
              Contact Support
            </Button>
          </div>
        </Card>
      </div>
    </ProtectedRoute>
  )
}