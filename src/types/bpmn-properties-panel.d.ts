// The properties panel packages ship no type declarations. Only what the modeler factory passes to bpmn-js.
declare module 'bpmn-js-properties-panel' {
  import type Modeler from 'bpmn-js/lib/Modeler';

  type BpmnModule = NonNullable<NonNullable<ConstructorParameters<typeof Modeler>[0]>['additionalModules']>[number];

  export const BpmnPropertiesPanelModule: BpmnModule;
  export const BpmnPropertiesProviderModule: BpmnModule;
  export const CamundaPlatformPropertiesProviderModule: BpmnModule;
}

declare module 'camunda-bpmn-js-behaviors/lib/camunda-platform' {
  import type Modeler from 'bpmn-js/lib/Modeler';

  const module: NonNullable<NonNullable<ConstructorParameters<typeof Modeler>[0]>['additionalModules']>[number];
  export default module;
}
