import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import PPATableOutputs from './PPA_table_O';
import PPATableInputs from './PPA_table_I';

const PPASummaryTable = () => {
  // Define the year limit
  const yearLimit = 3;

  return (
    <Tabs defaultValue="outputs" className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Datatable</h2>
          <p className="text-sm text-gray-500">Showing first {yearLimit} years of data</p>
        </div>
        <TabsList>
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
          <TabsTrigger value="outputs">Outputs</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="inputs">
        <Card>
          <CardContent className="pt-6">
            <PPATableInputs yearLimit={yearLimit} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="outputs">
        <Card>
          <CardContent className="pt-6">
            <PPATableOutputs yearLimit={yearLimit} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default PPASummaryTable;