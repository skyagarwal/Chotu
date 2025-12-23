'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, Brain, Clock, CheckCircle, XCircle, Loader2, Plus } from 'lucide-react';

interface Dataset {
  id: string;
  name: string;
  description?: string;
  module?: string;
  exampleCount?: number;
  createdAt: string;
}

interface TrainingJob {
  id: string;
  name?: string;
  type: string;
  datasetId: string;
  status: 'queued' | 'training' | 'succeeded' | 'failed';
  progress: number;
  createdAt: string;
}

export default function TrainingDatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [jobs, setJobs] = useState<TrainingJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [datasetsRes, jobsRes] = await Promise.all([
        fetch('http://localhost:8080/training/datasets'),
        fetch('http://localhost:8080/training/jobs'),
      ]);

      if (datasetsRes.ok) {
        const datasetsData = await datasetsRes.json();
        setDatasets(datasetsData);
      }

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(jobsData);
      }
    } catch (error) {
      console.error('Failed to load training data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'training':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      succeeded: 'default',
      failed: 'destructive',
      training: 'secondary',
      queued: 'outline',
    };

    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Training Datasets</h1>
          <p className="text-gray-500 mt-1">
            Manage NLU training data and monitor training jobs
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Dataset
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Datasets</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{datasets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Jobs</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Succeeded</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobs.filter((j) => j.status === 'succeeded').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobs.length > 0
                ? Math.round((jobs.filter((j) => j.status === 'succeeded').length / jobs.length) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Datasets List */}
      <Card>
        <CardHeader>
          <CardTitle>Datasets</CardTitle>
          <CardDescription>
            Training datasets with examples for NLU model training
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {datasets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No datasets found. Create your first dataset to get started.
              </div>
            ) : (
              datasets.map((dataset) => (
                <div
                  key={dataset.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Database className="h-8 w-8 text-blue-500" />
                    <div>
                      <div className="font-semibold">{dataset.name}</div>
                      <div className="text-sm text-gray-500">
                        {dataset.description || dataset.id}
                      </div>
                      {dataset.module && (
                        <Badge variant="outline" className="mt-1">
                          {dataset.module}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {dataset.exampleCount || 0} examples
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(dataset.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Training Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Training Jobs</CardTitle>
          <CardDescription>Monitor NLU model training progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No training jobs yet. Start training a model to see progress here.
              </div>
            ) : (
              jobs
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 10)
                .map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(job.status)}
                      <div>
                        <div className="font-semibold">{job.name || job.id}</div>
                        <div className="text-sm text-gray-500">
                          Dataset: {job.datasetId}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-semibold">
                          {Math.round(job.progress * 100)}%
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(job.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      {getStatusBadge(job.status)}
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
