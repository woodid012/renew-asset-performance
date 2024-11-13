import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import PPATable from './test_file';

const PPASummaryTable = () => {
  return (
    <Tabs defaultValue="outputs" className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Datatable</h2>
        <TabsList>
          <TabsTrigger value="outputs">Outputs</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="outputs">
        <Card>
          <CardContent className="pt-6">
            <PPATable />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default PPASummaryTable;