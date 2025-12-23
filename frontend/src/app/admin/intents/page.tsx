'use client';

import { useState, useEffect } from 'react';
import { Brain, Plus, Trash2, Edit, Search, Save, X } from 'lucide-react';
import { LoadingSpinner, useToast } from '@/components/shared';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface Intent {
  id: string;
  name: string;
  description: string;
  examples: string[];
  parameters: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function IntentsPage() {
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIntent, setEditingIntent] = useState<Intent | null>(null);
  const toast = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    examples: '',
  });

  useEffect(() => {
    loadIntents();
  }, []);

  const loadIntents = async () => {
    setLoading(true);
    try {
      const data = await mangwaleAIClient.getIntents();
      setIntents(data);
    } catch (error) {
      console.error('Failed to load intents:', error);
      toast.error('Failed to load intents');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (intent?: Intent) => {
    if (intent) {
      setEditingIntent(intent);
      setFormData({
        name: intent.name,
        description: intent.description || '',
        examples: intent.examples.join('\n'),
      });
    } else {
      setEditingIntent(null);
      setFormData({
        name: '',
        description: '',
        examples: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        examples: formData.examples.split('\n').filter(e => e.trim().length > 0),
        parameters: {}, // Default empty for now
        enabled: true,
      };

      if (editingIntent) {
        await mangwaleAIClient.updateIntent(editingIntent.id, payload);
        toast.success('Intent updated successfully');
      } else {
        await mangwaleAIClient.createIntent(payload);
        toast.success('Intent created successfully');
      }

      setIsModalOpen(false);
      loadIntents();
    } catch (error) {
      console.error('Failed to save intent:', error);
      toast.error('Failed to save intent');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this intent?')) return;
    try {
      await mangwaleAIClient.deleteIntent(id);
      toast.success('Intent deleted successfully');
      loadIntents();
    } catch (error) {
      console.error('Failed to delete intent:', error);
      toast.error('Failed to delete intent');
    }
  };

  const filteredIntents = intents.filter(intent => 
    intent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    intent.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading intents..." fullPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Brain size={32} />
              <h1 className="text-3xl font-bold">Intent Management</h1>
              <InfoTooltip content="Intents represent what the user wants to do (e.g., 'book_parcel', 'order_food'). Define them here so the NLU can recognize them." position="right" />
            </div>
            <p className="text-purple-100">
              Define and manage NLU intents for dynamic routing
            </p>
          </div>
          <Button 
            onClick={() => handleOpenModal()}
            className="bg-white text-purple-600 hover:bg-purple-50"
          >
            <Plus size={20} className="mr-2" />
            Create Intent
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <Input 
          placeholder="Search intents..." 
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Intents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntents.map(intent => (
          <div key={intent.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{intent.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{intent.description}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenModal(intent)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(intent.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Examples</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {intent.examples.slice(0, 3).map((ex, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-normal">
                      {ex}
                    </Badge>
                  ))}
                  {intent.examples.length > 3 && (
                    <Badge variant="outline" className="text-xs text-gray-500">
                      +{intent.examples.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingIntent ? 'Edit Intent' : 'Create New Intent'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Intent Name (Trigger)</label>
              <Input 
                placeholder="e.g., check_weather" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                disabled={!!editingIntent} // Prevent renaming for now to avoid breaking flows
              />
              <p className="text-xs text-gray-500">This is the key used in Flows to trigger actions.</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input 
                placeholder="What does this intent do?" 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Training Examples (One per line)</label>
              <Textarea 
                placeholder="What is the weather?&#10;Check weather&#10;Is it raining?" 
                className="h-32"
                value={formData.examples}
                onChange={(e) => setFormData({...formData, examples: e.target.value})}
              />
              <p className="text-xs text-gray-500">These examples help the LLM understand when to trigger this intent.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Save Intent</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
