import {ApplicationContext} from 'context';
import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {OperationDescriptor} from "cad/craft/operationPlugin";


interface PrimitiveSphereParams {
  radius: number,
  locations: {},
  boolean: BooleanDefinition,
}

export const PrimitiveSphereOperation: OperationDescriptor<PrimitiveSphereParams> = {
  id: 'PRIMITIVE_SPHERE',
  label: 'Primitive Sphere',
  icon: 'img/cad/sphere',
  info: 'Primitive Sphere',
  paramsInfo: ({radius,}) => `(${r(radius)}  )`,
  form: [
    {
      type: 'number',
      label: 'Radius',
      name: 'radius',
      defaultValue: 50,
    },

    {
      type: 'selection',
      name: 'locations',
      capture: [EntityKind.DATUM],
      label: 'locations',
      multi: false,
      optional: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },

    {
      type: 'boolean',
      name: 'boolean',
      label: 'boolean',
      optional: true,
    }

  ],


  run: (params: PrimitiveSphereParams, ctx: ApplicationContext) => {

    let occ = ctx.occService;
    const oci = occ.commandInterface;

    //pSphere cy 5 10
    oci.psphere("Sphere", params.radius);

    return occ.utils.applyBooleanModifier(["Sphere"], params.boolean);

  },
}
