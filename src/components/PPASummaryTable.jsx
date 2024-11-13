// PPASummary.jsx
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PPAInputs from "@/components/PPAInputs";
import PPAOutputs from "@/components/PPAOutputs";

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
        <PPAInputs />
      </TabsContent>

      <TabsContent value="outputs">
        <PPAOutputs />
      </TabsContent>
    </Tabs>
  );
};

export default PPASummaryTable;