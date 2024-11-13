// PPASummaryTable.jsx
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

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
            <div className="text-center p-4">
              <p className="text-muted-foreground">PPA Inputs Data Coming Soon</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="outputs">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center p-4">
              <p className="text-muted-foreground">PPA Outputs Data Coming Soon</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default PPASummaryTable;