import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import PPAInputs from './PPAInputs';
import PPAOutputs from './PPAOutputs';

const PPASummaryTable = () => {
  return (
    <Tabs defaultValue="inputs" className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Datatable</h2>
        <TabsList>
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
          <TabsTrigger value="outputs">Outputs</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="inputs">
        <Card>
          <CardContent className="pt-6">
            <PPAInputs />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="outputs">
        <Card>
          <CardContent className="pt-6">
            <PPAOutputs />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default PPASummaryTable;