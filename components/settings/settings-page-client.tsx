'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CategoryManager } from './category-manager'
import { LocationManager } from './location-manager'
import { StockSettings } from './stock-settings'
import { CustomFieldManager } from './custom-field-manager'
import { UnitManager } from './unit-manager'
import type { Category, StorageLocation, Setting, CustomField } from '@/types'

interface SettingsPageClientProps {
  initialCategories: Category[]
  initialLocations: StorageLocation[]
  initialSettings: Setting[]
  initialCustomFields: CustomField[]
}

export function SettingsPageClient({
  initialCategories,
  initialLocations,
  initialSettings,
  initialCustomFields,
}: SettingsPageClientProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [locations, setLocations] = useState(initialLocations)
  const [settings, setSettings] = useState(initialSettings)
  const [customFields, setCustomFields] = useState(initialCustomFields)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">환경 설정</h1>
        <p className="mt-1 text-muted-foreground">
          시스템 설정을 관리합니다.
        </p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">카테고리 관리</TabsTrigger>
          <TabsTrigger value="units">단위 관리</TabsTrigger>
          <TabsTrigger value="locations">보관 위치 관리</TabsTrigger>
          <TabsTrigger value="stock">재고 기준 설정</TabsTrigger>
          <TabsTrigger value="custom-fields">커스텀 필드 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-4">
          <CategoryManager
            categories={categories}
            onCategoriesChange={setCategories}
          />
        </TabsContent>

        <TabsContent value="units" className="mt-4">
          <UnitManager settings={settings} onSettingsChange={setSettings} />
        </TabsContent>

        <TabsContent value="locations" className="mt-4">
          <LocationManager
            locations={locations}
            onLocationsChange={setLocations}
          />
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <StockSettings settings={settings} onSettingsChange={setSettings} />
        </TabsContent>

        <TabsContent value="custom-fields" className="mt-4">
          <CustomFieldManager
            customFields={customFields}
            onCustomFieldsChange={setCustomFields}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
