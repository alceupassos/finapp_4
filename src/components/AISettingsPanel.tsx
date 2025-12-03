import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Button, Switch, Select, SelectItem, NumberInput, Grid, Col, TextInput, Badge } from '@tremor/react';
import { Settings, Brain, DollarSign, Activity, Save, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  costPer1K: number;
  contextWindow: number;
  status: 'active' | 'inactive';
}

interface AISettings {
  defaultModel: string;
  streamingEnabled: boolean;
  maxTokensPerRequest: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  rateLimitPerMinute: number;
  dailyCostLimit: number;
  monthlyCostLimit: number;
  enableUsageTracking: boolean;
  enableCostAlerts: boolean;
  costAlertThreshold: number;
}

const availableModels: AIModel[] = [
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    maxTokens: 128000,
    costPer1K: 0.01,
    contextWindow: 128000,
    status: 'active'
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    maxTokens: 8192,
    costPer1K: 0.03,
    contextWindow: 8192,
    status: 'active'
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    maxTokens: 4096,
    costPer1K: 0.002,
    contextWindow: 4096,
    status: 'active'
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    maxTokens: 200000,
    costPer1K: 0.003,
    contextWindow: 200000,
    status: 'inactive'
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    maxTokens: 200000,
    costPer1K: 0.015,
    contextWindow: 200000,
    status: 'inactive'
  }
];

const defaultSettings: AISettings = {
  defaultModel: 'gpt-4-turbo',
  streamingEnabled: true,
  maxTokensPerRequest: 4000,
  temperature: 0.7,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0,
  rateLimitPerMinute: 60,
  dailyCostLimit: 100,
  monthlyCostLimit: 2000,
  enableUsageTracking: true,
  enableCostAlerts: true,
  costAlertThreshold: 80
};

export default function AISettingsPanel() {
  const [settings, setSettings] = useState<AISettings>(defaultSettings);
  const [currentUsage, setCurrentUsage] = useState({
    dailyCost: 45.32,
    monthlyCost: 892.45,
    requestsToday: 234,
    requestsThisMonth: 5678
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('aiSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSettingChange = (key: keyof AISettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage and potentially API
      localStorage.setItem('aiSettings', JSON.stringify(settings));
      
      // Here you would typically save to your backend
      // await saveAISettings(settings);
      
      setHasChanges(false);
      
      // Show success notification
      const event = new CustomEvent('showToast', {
        detail: { message: 'Configurações de IA salvas com sucesso!', type: 'success' }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      const event = new CustomEvent('showToast', {
        detail: { message: 'Erro ao salvar configurações', type: 'error' }
      });
      window.dispatchEvent(event);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  const dailyCostPercentage = (currentUsage.dailyCost / settings.dailyCostLimit) * 100;
  const monthlyCostPercentage = (currentUsage.monthlyCost / settings.monthlyCostLimit) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <Title className="text-2xl font-bold text-gray-900 dark:text-white">
              Configurações de IA Avançada
            </Title>
            <Text className="text-gray-600 dark:text-gray-400">
              Gerencie modelos, custos e configurações avançadas de IA
            </Text>
          </div>
        </div>
        {hasChanges && (
          <Badge color="yellow" size="sm">Alterações pendentes</Badge>
        )}
      </div>

      {/* Usage Overview */}
      <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm font-medium text-blue-600 dark:text-blue-300">Custo Diário</Text>
              <Title className="text-2xl font-bold text-blue-900 dark:text-white">
                R$ {currentUsage.dailyCost.toFixed(2)}
              </Title>
              <Text className="text-xs text-blue-600 dark:text-blue-300">
                {dailyCostPercentage.toFixed(1)}% do limite
              </Text>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm font-medium text-purple-600 dark:text-purple-300">Custo Mensal</Text>
              <Title className="text-2xl font-bold text-purple-900 dark:text-white">
                R$ {currentUsage.monthlyCost.toFixed(2)}
              </Title>
              <Text className="text-xs text-purple-600 dark:text-purple-300">
                {monthlyCostPercentage.toFixed(1)}% do limite
              </Text>
            </div>
            <Activity className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm font-medium text-green-600 dark:text-green-300">Requisições Hoje</Text>
              <Title className="text-2xl font-bold text-green-900 dark:text-white">
                {currentUsage.requestsToday}
              </Title>
              <Text className="text-xs text-green-600 dark:text-green-300">
                {settings.rateLimitPerMinute} req/min
              </Text>
            </div>
            <Activity className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm font-medium text-orange-600 dark:text-orange-300">Este Mês</Text>
              <Title className="text-2xl font-bold text-orange-900 dark:text-white">
                {currentUsage.requestsThisMonth}
              </Title>
              <Text className="text-xs text-orange-600 dark:text-orange-300">
                requisições totais
              </Text>
            </div>
            <Activity className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
      </Grid>

      {/* Model Selection */}
      <Card className="dark:bg-gray-800">
        <Title className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Modelo Padrão
        </Title>
        <div className="space-y-4">
          <Select
            value={settings.defaultModel}
            onValueChange={(value) => handleSettingChange('defaultModel', value)}
          >
            {availableModels
              .filter(model => model.status === 'active')
              .map(model => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <Text className="font-medium">{model.name}</Text>
                      <Text className="text-xs text-gray-500">{model.provider}</Text>
                    </div>
                    <Badge color="green" size="sm">
                      R$ {model.costPer1K}/1K tokens
                    </Badge>
                  </div>
                </SelectItem>
              ))}
          </Select>

          <div className="flex items-center justify-between">
            <div>
              <Text className="font-medium text-gray-900 dark:text-white">Streaming Ativado</Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                Respostas em tempo real para melhor experiência
              </Text>
            </div>
            <Switch
              checked={settings.streamingEnabled}
              onChange={(checked) => handleSettingChange('streamingEnabled', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Advanced Parameters */}
      <Card className="dark:bg-gray-800">
        <Title className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Parâmetros Avançados
        </Title>
        <Grid numItems={1} numItemsSm={2} className="gap-4">
          <div className="space-y-2">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Temperatura: {settings.temperature}
            </Text>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              Controla criatividade (0 = conservador, 2 = criativo)
            </Text>
          </div>

          <div className="space-y-2">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Top P: {settings.topP}
            </Text>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.topP}
              onChange={(e) => handleSettingChange('topP', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              Diversidade de tokens
            </Text>
          </div>

          <div>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Máximo de Tokens por Requisição</Text>
            <NumberInput
              value={settings.maxTokensPerRequest}
              onChange={(value) => handleSettingChange('maxTokensPerRequest', value)}
              min={100}
              max={128000}
              step={100}
            />
          </div>

          <div>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Limite de Requisições por Minuto</Text>
            <NumberInput
              value={settings.rateLimitPerMinute}
              onChange={(value) => handleSettingChange('rateLimitPerMinute', value)}
              min={10}
              max={1000}
              step={10}
            />
          </div>
        </Grid>
      </Card>

      {/* Cost Controls */}
      <Card className="dark:bg-gray-800">
        <Title className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Controle de Custos
        </Title>
        <Grid numItems={1} numItemsSm={2} className="gap-4">
          <div>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Limite Diário de Custo (R$)</Text>
            <NumberInput
              value={settings.dailyCostLimit}
              onChange={(value) => handleSettingChange('dailyCostLimit', value)}
              min={1}
              max={10000}
              step={1}
            />
          </div>

          <div>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Limite Mensal de Custo (R$)</Text>
            <NumberInput
              value={settings.monthlyCostLimit}
              onChange={(value) => handleSettingChange('monthlyCostLimit', value)}
              min={10}
              max={100000}
              step={10}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Text className="font-medium text-gray-900 dark:text-white">Alertas de Custo</Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  Notificações quando atingir limite
                </Text>
              </div>
              <Switch
                checked={settings.enableCostAlerts}
                onChange={(checked) => handleSettingChange('enableCostAlerts', checked)}
              />
            </div>

            {settings.enableCostAlerts && (
              <div>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Threshold de Alerta (%)</Text>
                <NumberInput
                  value={settings.costAlertThreshold}
                  onChange={(value) => handleSettingChange('costAlertThreshold', value)}
                  min={50}
                  max={100}
                  step={5}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Text className="font-medium text-gray-900 dark:text-white">Tracking de Uso</Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                Monitorar todas as requisições
              </Text>
            </div>
            <Switch
              checked={settings.enableUsageTracking}
              onChange={(checked) => handleSettingChange('enableUsageTracking', checked)}
            />
          </div>
        </Grid>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Button
          variant="secondary"
          icon={RotateCcw}
          onClick={handleReset}
          disabled={isSaving}
        >
          Resetar Padrões
        </Button>
        <Button
          icon={Save}
          onClick={handleSave}
          loading={isSaving}
          disabled={!hasChanges || isSaving}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          Salvar Alterações
        </Button>
      </div>
    </motion.div>
  );
}