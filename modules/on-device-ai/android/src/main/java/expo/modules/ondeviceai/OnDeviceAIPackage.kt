package expo.modules.ondeviceai

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.Package

class OnDeviceAIPackage : Package {
    override fun createModules(): List<Module> = listOf(OnDeviceAIModule())
}
